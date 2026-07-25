import {
  doc,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TRANSACTIONS_PATH = "transactions";
const RECENT_TRANSACTIONS_LIMIT = 5;
export const TRANSACTIONS_PAGE_SIZE = 25;

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "referral_reward"
  | "daily_reward"
  | "package_purchase"
  | "task_reward"
  | "bonus_reward"
  | "admin_adjustment";

export type TransactionTypeFilter = TransactionType | "all";

export type TransactionStatus = "pending" | "completed" | "failed";

// Which of the four wallets this entry actually moved money into/out of —
// null only for entries with no single wallet effect (a package-purchase
// deposit activates a package rather than crediting any wallet).
export type TransactionWallet = "walletBalance" | "currentBalance" | "cocaColaEarning" | "staffEarning";

// An append-only ledger — the platform's complete financial history.
// Every writer is a trusted admin-run approval/adjustment transaction or the
// caller's own automatic-daily-earning/self-service-claim transaction; every
// entry it produces is already "completed" or (for the legacy self-service
// daily-claim branch) written directly as completed, since only real,
// already-happened money movements are recorded here — never a placeholder
// for something that might fail later. `referenceId` links back to the
// source document this entry is about (deposit/withdrawal/taskSubmission/
// bonusClaim/referralReward/dailyReward id) wherever one naturally exists;
// null for admin manual wallet adjustments, which have no such document
// (the activityLogs entry from the same action is the record of "why").
export type TransactionDoc = {
  uid: string;
  // Denormalized at write time so the admin Financial History ledger can
  // display who a row is about without an extra read per row — the same
  // pattern already used by deposits/withdrawals/taskSubmissions.
  userName: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  wallet: TransactionWallet | null;
  referenceId: string | null;
  createdAt: Timestamp;
};

export function transactionsCollection(db: Firestore) {
  return typedCollection<TransactionDoc>(db, TRANSACTIONS_PATH);
}

// Generates a fresh auto-id ref for use inside a runTransaction, where
// addDoc() isn't available (transaction writes require a ref obtained
// ahead of time).
export function newTransactionRef(db: Firestore) {
  return doc(transactionsCollection(db));
}

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function recentTransactionsQuery(
  db: Firestore,
  uid: string,
): Query<TransactionDoc> {
  return query(
    transactionsCollection(db),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_TRANSACTIONS_LIMIT),
  );
}

// A paginated variant of recentTransactionsQuery for the user's own full
// Transaction History (Wallet page), not just the 5-item dashboard preview.
// The unfiltered branch reuses the same (uid asc, createdAt desc) composite
// index as recentTransactionsQuery; the type-filtered branch requires an
// additional (uid asc, type asc, createdAt desc) composite — see
// firestore.indexes.json.
export function myTransactionsPageQuery(
  db: Firestore,
  uid: string,
  typeFilter: TransactionTypeFilter,
  cursor: QueryDocumentSnapshot<TransactionDoc> | null,
): Query<TransactionDoc> {
  const base =
    typeFilter === "all"
      ? query(transactionsCollection(db), where("uid", "==", uid), orderBy("createdAt", "desc"))
      : query(
          transactionsCollection(db),
          where("uid", "==", uid),
          where("type", "==", typeFilter),
          orderBy("createdAt", "desc"),
        );
  return cursor
    ? query(base, startAfter(cursor), limit(TRANSACTIONS_PAGE_SIZE))
    : query(base, limit(TRANSACTIONS_PAGE_SIZE));
}

// --- Admin dashboard aggregates ---

export function transactionsByTypeQuery(
  db: Firestore,
  type: TransactionType,
): Query<TransactionDoc> {
  return query(transactionsCollection(db), where("type", "==", type));
}

// Requires a single-field index on createdAt (automatic) — used both for
// "today's earnings paid" (an inequality on createdAt) and the aggregate sum.
export function dailyRewardTransactionsSinceQuery(db: Firestore, sinceMs: number): Query<TransactionDoc> {
  return query(
    transactionsCollection(db),
    where("type", "==", "daily_reward"),
    where("createdAt", ">=", new Date(sinceMs)),
  );
}

// --- Admin Financial History (full ledger browse) ---

// Requires a composite index (type asc, createdAt desc) for the filtered
// branch — see firestore.indexes.json. The unfiltered branch only needs the
// automatic single-field index on createdAt.
export function adminTransactionsPageQuery(
  db: Firestore,
  typeFilter: TransactionTypeFilter,
  cursor: QueryDocumentSnapshot<TransactionDoc> | null,
): Query<TransactionDoc> {
  const base =
    typeFilter === "all"
      ? query(transactionsCollection(db), orderBy("createdAt", "desc"))
      : query(transactionsCollection(db), where("type", "==", typeFilter), orderBy("createdAt", "desc"));
  return cursor
    ? query(base, startAfter(cursor), limit(TRANSACTIONS_PAGE_SIZE))
    : query(base, limit(TRANSACTIONS_PAGE_SIZE));
}
