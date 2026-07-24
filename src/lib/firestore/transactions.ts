import {
  doc,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TRANSACTIONS_PATH = "transactions";
const RECENT_TRANSACTIONS_LIMIT = 5;

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "referral_reward"
  | "daily_reward"
  | "package_purchase"
  | "task_reward"
  | "bonus_reward";

export type TransactionStatus = "pending" | "completed" | "failed";

// An append-only ledger. The only writer is the admin deposit/withdrawal
// approval transaction (Milestone 8) — every entry it produces is already
// "completed", since only real, already-approved money movements are
// recorded here.
export type TransactionDoc = {
  uid: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
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

// --- Admin dashboard aggregates ---

export function transactionsByTypeQuery(
  db: Firestore,
  type: TransactionType,
): Query<TransactionDoc> {
  return query(transactionsCollection(db), where("type", "==", type));
}
