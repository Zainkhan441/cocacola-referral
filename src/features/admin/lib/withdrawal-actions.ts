import { getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { withdrawalDocRef, type WithdrawalSourceWallet } from "@/lib/firestore/withdrawals";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { newTransactionRef } from "@/lib/firestore/transactions";
import { getDirectActiveReferralCount } from "@/lib/firestore/team-members";
import { getWithdrawalRules } from "@/lib/firestore/settings";
import { newSystemNotificationRef, buildSystemNotificationData } from "@/lib/firestore/user-notifications";
import { logActivity } from "@/lib/firestore/activity-logs";
import { formatCurrency } from "@/lib/format";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

const DEFAULT_COCA_COLA_REQUIRED_LEVEL = 10;

const SOURCE_WALLET_LABELS: Record<WithdrawalSourceWallet, string> = {
  current_balance: "Current Balance",
  coca_cola_earning: "Coca-Cola Earning",
};

// Approves a pending withdrawal: deducts the requested source wallet — Current
// Balance or Coca-Cola Earning, per withdrawal.sourceWallet — from both
// users/{uid} and the mirrored wallets/{uid}, and writes one completed ledger
// transaction, atomically. Re-checks the withdrawal is still pending AND that
// the balance still covers it (it may have changed since the request was
// submitted) at write time — if either fails, the whole transaction is
// rejected, so a wallet can never go negative or be double-debited.
//
// The Coca-Cola Earning path additionally requires the requester's direct
// active-referral count to meet the admin-editable required Level (default
// 10) — Firestore rules can't run the aggregate count query this needs (see
// firestore.rules withdrawals/{id} create rule), so this is re-verified here
// with a LIVE getDirectActiveReferralCount() read, BEFORE the money-moving
// transaction starts, exactly mirroring approveBonusClaim's live team-
// aggregate re-check. If the requester no longer meets the Level, this
// throws without crediting anything, so the admin can reject instead.
export async function approveWithdrawal(
  withdrawalId: string,
  reviewer: Reviewer,
  note?: string | null,
): Promise<void> {
  const db = requireDb();

  const withdrawalSnapPreCheck = await getDoc(withdrawalDocRef(db, withdrawalId));
  if (!withdrawalSnapPreCheck.exists()) {
    throw new Error("This withdrawal request no longer exists.");
  }
  const withdrawalPreCheck = withdrawalSnapPreCheck.data();
  if (withdrawalPreCheck.status !== "pending") {
    throw new Error("This withdrawal request has already been reviewed.");
  }

  if (withdrawalPreCheck.sourceWallet === "coca_cola_earning") {
    const [directActiveReferrals, withdrawalRules] = await Promise.all([
      getDirectActiveReferralCount(db, withdrawalPreCheck.uid),
      getWithdrawalRules(db),
    ]);
    const requiredLevel = withdrawalRules?.cocaColaRequiredLevel ?? DEFAULT_COCA_COLA_REQUIRED_LEVEL;
    if (directActiveReferrals < requiredLevel) {
      throw new Error(
        `This user no longer meets the required Level ${requiredLevel} (has ${directActiveReferrals} direct active referrals). Please reject this withdrawal instead.`,
      );
    }
  }

  const txnRef = newTransactionRef(db);
  const notificationRef = newSystemNotificationRef(db);
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

    const sourceField = withdrawal.sourceWallet === "current_balance" ? "currentBalance" : "cocaColaEarning";
    const currentSourceBalance = user[sourceField];

    if (withdrawal.amount > currentSourceBalance) {
      throw new Error("This user's balance is lower than the withdrawal amount.");
    }

    const newSourceBalance = currentSourceBalance - withdrawal.amount;

    transaction.update(userRef, {
      [sourceField]: newSourceBalance,
      updatedAt: serverTimestamp(),
    });
    transaction.update(walletDocRef(db, withdrawal.uid), {
      [sourceField]: newSourceBalance,
      updatedAt: serverTimestamp(),
    });
    transaction.update(withdrawalDocRef(db, withdrawalId), {
      status: "approved",
      reviewedBy: reviewer.adminUid,
      reviewNote: note?.trim() || null,
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
    transaction.set(
      notificationRef,
      buildSystemNotificationData({
        uid: withdrawal.uid,
        kind: "withdrawal",
        title: "Withdrawal approved",
        body: `Your ${formatCurrency(withdrawal.amount)} ${SOURCE_WALLET_LABELS[withdrawal.sourceWallet]} withdrawal was approved and sent to ${withdrawal.accountNumber}.`,
      }),
    );

    capturedAmount = withdrawal.amount;
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "withdrawal.approved",
    targetType: "withdrawal",
    targetId: withdrawalId,
    details: `Approved a ${formatCurrency(capturedAmount)} withdrawal` + (note?.trim() ? ` — note: ${note.trim()}` : ""),
  });
}

export async function rejectWithdrawal(
  withdrawalId: string,
  reviewer: Reviewer,
  note?: string | null,
): Promise<void> {
  const db = requireDb();
  const notificationRef = newSystemNotificationRef(db);

  await runTransaction(db, async (transaction) => {
    const withdrawalSnap = await transaction.get(withdrawalDocRef(db, withdrawalId));
    if (!withdrawalSnap.exists()) {
      throw new Error("This withdrawal request no longer exists.");
    }
    const withdrawal = withdrawalSnap.data();
    if (withdrawal.status !== "pending") {
      throw new Error("This withdrawal request has already been reviewed.");
    }

    transaction.update(withdrawalDocRef(db, withdrawalId), {
      status: "rejected",
      reviewedBy: reviewer.adminUid,
      reviewNote: note?.trim() || null,
      updatedAt: serverTimestamp(),
    });

    transaction.set(
      notificationRef,
      buildSystemNotificationData({
        uid: withdrawal.uid,
        kind: "withdrawal",
        title: "Withdrawal rejected",
        body: note?.trim()
          ? `Your ${formatCurrency(withdrawal.amount)} ${SOURCE_WALLET_LABELS[withdrawal.sourceWallet]} withdrawal was rejected: ${note.trim()}`
          : `Your ${formatCurrency(withdrawal.amount)} ${SOURCE_WALLET_LABELS[withdrawal.sourceWallet]} withdrawal was rejected. Please contact support for details.`,
      }),
    );
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "withdrawal.rejected",
    targetType: "withdrawal",
    targetId: withdrawalId,
    details: "Rejected withdrawal request" + (note?.trim() ? ` — note: ${note.trim()}` : ""),
  });
}
