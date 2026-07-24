import {
  addDoc,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const WITHDRAWALS_PATH = "withdrawals";
const RECENT_WITHDRAWALS_LIMIT = 10;
export const WITHDRAWALS_PAGE_SIZE = 20;
const WITHDRAWAL_METHOD = "easypaisa" as const;

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";
export type WithdrawalMethod = typeof WITHDRAWAL_METHOD;
// Which of the two independently-withdrawable wallets this request draws
// from — Staff Earning has no withdrawal path (see users/{uid}.staffEarning).
export type WithdrawalSourceWallet = "current_balance" | "coca_cola_earning";

export type WithdrawalDoc = {
  uid: string;
  // Denormalized at submission time so the admin review queue can display
  // who a request is from without an extra read per row.
  userName: string;
  amount: number;
  sourceWallet: WithdrawalSourceWallet;
  method: WithdrawalMethod;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  reviewedBy: string | null;
  // Optional admin-entered context for the review decision (e.g. why a
  // withdrawal was rejected) — shown to the user alongside the
  // status-change notification. Null until an admin reviews the request.
  reviewNote: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function withdrawalsCollection(db: Firestore) {
  return typedCollection<WithdrawalDoc>(db, WITHDRAWALS_PATH);
}

export function withdrawalDocRef(db: Firestore, withdrawalId: string) {
  return doc(withdrawalsCollection(db), withdrawalId);
}

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function recentWithdrawalsQuery(db: Firestore, uid: string): Query<WithdrawalDoc> {
  return query(
    withdrawalsCollection(db),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_WITHDRAWALS_LIMIT),
  );
}

// --- Admin review queues ---

// Requires a single-field index on createdAt (automatic).
export function withdrawalsPageQuery(
  db: Firestore,
  cursor: QueryDocumentSnapshot<WithdrawalDoc> | null,
): Query<WithdrawalDoc> {
  return cursor
    ? query(withdrawalsCollection(db), orderBy("createdAt", "desc"), startAfter(cursor), limit(WITHDRAWALS_PAGE_SIZE))
    : query(withdrawalsCollection(db), orderBy("createdAt", "desc"), limit(WITHDRAWALS_PAGE_SIZE));
}

// Requires a composite index (status asc, createdAt desc) — see firestore.indexes.json.
export function withdrawalsByStatusPageQuery(
  db: Firestore,
  status: WithdrawalStatus,
  cursor: QueryDocumentSnapshot<WithdrawalDoc> | null,
): Query<WithdrawalDoc> {
  return cursor
    ? query(
        withdrawalsCollection(db),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(WITHDRAWALS_PAGE_SIZE),
      )
    : query(
        withdrawalsCollection(db),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(WITHDRAWALS_PAGE_SIZE),
      );
}

type CreateWithdrawalRequestInput = {
  uid: string;
  userName: string;
  amount: number;
  sourceWallet: WithdrawalSourceWallet;
  accountName: string;
  accountNumber: string;
};

export async function createWithdrawalRequest(
  db: Firestore,
  input: CreateWithdrawalRequestInput,
): Promise<void> {
  await addDoc(withdrawalsCollection(db), {
    uid: input.uid,
    userName: input.userName,
    amount: input.amount,
    sourceWallet: input.sourceWallet,
    method: WITHDRAWAL_METHOD,
    accountName: input.accountName,
    accountNumber: input.accountNumber,
    status: "pending",
    reviewedBy: null,
    reviewNote: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
