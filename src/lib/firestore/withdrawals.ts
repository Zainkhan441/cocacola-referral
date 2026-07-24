import {
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

// A fresh auto-id ref, generated ahead of time so submitWithdrawalRequest
// can atomically mark it as this user's pending request for the same
// wallet in the same transaction (see users/{uid}.pendingWithdrawal*).
export function newWithdrawalRef(db: Firestore) {
  return doc(withdrawalsCollection(db));
}

// The users/{uid} marker field that must be null before a new request
// against this wallet can be created, and is cleared again on
// approve/reject — mirrors pendingPackagePurchaseId's role for deposits,
// one-per-wallet instead of one-total, so a user can't pile up an unbounded
// number of simultaneous pending withdrawal requests against the same
// wallet (each individually valid against their balance at request time,
// but collectively exceeding it many times over — the admin approval flow
// is still money-safe either way since it re-checks the live balance, but
// unbounded pending requests are an operational/spam concern worth closing).
export function pendingWithdrawalFieldFor(
  sourceWallet: WithdrawalSourceWallet,
): "pendingWithdrawalCurrentBalance" | "pendingWithdrawalCocaColaEarning" {
  return sourceWallet === "current_balance"
    ? "pendingWithdrawalCurrentBalance"
    : "pendingWithdrawalCocaColaEarning";
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

// Exported so submitWithdrawalRequest (features/wallet/lib/actions.ts) can
// write this alongside the users/{uid} pending-marker update in the same
// atomic transaction, the same shape as buildDepositData/buildTeamMemberData.
export function buildWithdrawalData(input: CreateWithdrawalRequestInput) {
  return {
    uid: input.uid,
    userName: input.userName,
    amount: input.amount,
    sourceWallet: input.sourceWallet,
    method: WITHDRAWAL_METHOD,
    accountName: input.accountName,
    accountNumber: input.accountNumber,
    status: "pending" as const,
    reviewedBy: null,
    reviewNote: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}
