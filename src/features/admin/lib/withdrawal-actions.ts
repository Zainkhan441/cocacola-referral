import { runTransaction, serverTimestamp } from "firebase/firestore";
import { withdrawalDocRef } from "@/lib/firestore/withdrawals";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { newTransactionRef } from "@/lib/firestore/transactions";
import { logActivity } from "@/lib/firestore/activity-logs";
import { formatCurrency } from "@/lib/format";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

// Approves a pending withdrawal: deducts the wallet (both users/{uid} and
// the mirrored wallets/{uid}) and writes one completed ledger transaction,
// atomically. Re-checks the withdrawal is still pending AND that the
// current balance still covers it (it may have changed since the request
// was submitted) at write time — if either fails, the whole transaction is
// rejected, so the wallet can never go negative or be double-debited.
export async function approveWithdrawal(withdrawalId: string, reviewer: Reviewer): Promise<void> {
  const db = requireDb();
  const txnRef = newTransactionRef(db);

  let capturedAmount = 0;

  await runTransaction(db, async (transaction) => {
    const withdrawalSnap = await transaction.get(withdrawalDocRef(db, withdrawalId));
    if (!withdrawalSnap.exists()) {
      throw new Error("This withdrawal request no longer exists.");
    }
    const withdrawal = withdrawalSnap.data();
    if (withdrawal.status !== "pending") {
      throw new Error("This withdrawal request has already been reviewed.");
    }

    const userRef = userDocRef(db, withdrawal.uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("This user's profile could not be found.");
    }
    const user = userSnap.data();

    if (withdrawal.amount > user.walletBalance) {
      throw new Error("This user's current balance is lower than the withdrawal amount.");
    }

    const newBalance = user.walletBalance - withdrawal.amount;

    transaction.update(userRef, {
      walletBalance: newBalance,
      updatedAt: serverTimestamp(),
    });
    transaction.update(walletDocRef(db, withdrawal.uid), {
      balance: newBalance,
      updatedAt: serverTimestamp(),
    });
    transaction.update(withdrawalDocRef(db, withdrawalId), {
      status: "approved",
      reviewedBy: reviewer.adminUid,
      updatedAt: serverTimestamp(),
    });
    transaction.set(txnRef, {
      uid: withdrawal.uid,
      type: "withdrawal",
      amount: withdrawal.amount,
      status: "completed",
      description: `Withdrawal to ${withdrawal.accountNumber}`,
      createdAt: serverTimestamp(),
    });

    capturedAmount = withdrawal.amount;
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "withdrawal.approved",
    targetType: "withdrawal",
    targetId: withdrawalId,
    details: `Approved a ${formatCurrency(capturedAmount)} withdrawal`,
  });
}

export async function rejectWithdrawal(withdrawalId: string, reviewer: Reviewer): Promise<void> {
  const db = requireDb();

  await runTransaction(db, async (transaction) => {
    const withdrawalSnap = await transaction.get(withdrawalDocRef(db, withdrawalId));
    if (!withdrawalSnap.exists()) {
      throw new Error("This withdrawal request no longer exists.");
    }
    if (withdrawalSnap.data().status !== "pending") {
      throw new Error("This withdrawal request has already been reviewed.");
    }

    transaction.update(withdrawalDocRef(db, withdrawalId), {
      status: "rejected",
      reviewedBy: reviewer.adminUid,
      updatedAt: serverTimestamp(),
    });
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "withdrawal.rejected",
    targetType: "withdrawal",
    targetId: withdrawalId,
    details: "Rejected withdrawal request",
  });
}
