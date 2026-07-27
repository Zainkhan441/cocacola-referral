import { runTransaction, serverTimestamp } from "firebase/firestore";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { newTransactionRef } from "@/lib/firestore/transactions";
import { newSystemNotificationRef, buildSystemNotificationData } from "@/lib/firestore/user-notifications";
import { logActivity } from "@/lib/firestore/activity-logs";
import { formatCurrency } from "@/lib/format";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

// Staff Earning is deliberately absent here — it is not a real wallet (see
// approveDeposit's top-level doc comment). It's a reporting view computed
// from the referralRewards collection and each teamMembers record's
// commissionEarned total, never a mutable balance an admin can nudge.
export type AdjustableWalletField = "currentBalance" | "cocaColaEarning";

const FIELD_LABELS: Record<AdjustableWalletField, string> = {
  currentBalance: "Current Balance",
  cocaColaEarning: "Coca-Cola Earning",
};

// Admin manual wallet adjustment: increase or decrease exactly one of the
// two earning wallets for one user — never walletBalance (the Deposit
// Wallet, reserved for top-ups only) — writing both users/{uid} and the
// mirrored wallets/{uid} atomically. `delta` may be negative (decrease) or
// positive (increase); the resulting balance can never go below 0, checked
// here AND independently re-enforced by firestore.rules adminCanUpdateUser.
// Unlike every other money-moving action in this app, this one has no
// natural source document (no deposit/withdrawal/submission caused it) — the
// transaction ledger entry this writes IS the only record of what changed
// and why beyond the admin activity log, so it (and the user notification)
// are not optional here.
export async function adjustUserWalletAction(
  uid: string,
  userName: string,
  field: AdjustableWalletField,
  delta: number,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  const txnRef = newTransactionRef(db);
  const notificationRef = newSystemNotificationRef(db);
  let capturedNext = 0;

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userDocRef(db, uid));
    if (!userSnap.exists()) {
      throw new Error("This user's profile could not be found.");
    }
    const user = userSnap.data();

    const next = user[field] + delta;
    if (next < 0) {
      throw new Error(`${FIELD_LABELS[field]} cannot go below Rs 0.`);
    }

    transaction.update(userDocRef(db, uid), {
      [field]: next,
      updatedAt: serverTimestamp(),
    });
    transaction.update(walletDocRef(db, uid), {
      [field]: next,
      updatedAt: serverTimestamp(),
    });
    transaction.set(txnRef, {
      uid,
      userName,
      type: "admin_adjustment",
      amount: Math.abs(delta),
      // admin_adjustment is the one transaction type whose direction isn't
      // implied by its own type — see transaction-direction.ts.
      direction: delta >= 0 ? "in" : "out",
      status: "completed",
      description: `Admin ${delta >= 0 ? "increased" : "decreased"} ${FIELD_LABELS[field]} by ${formatCurrency(Math.abs(delta))}`,
      wallet: field,
      referenceId: null,
      createdAt: serverTimestamp(),
    });
    transaction.set(
      notificationRef,
      buildSystemNotificationData({
        uid,
        kind: "admin_adjustment",
        title: delta >= 0 ? "Balance increased" : "Balance decreased",
        body: `Your ${FIELD_LABELS[field]} was ${delta >= 0 ? "increased" : "decreased"} by ${formatCurrency(Math.abs(delta))} by an administrator.`,
      }),
    );

    capturedNext = next;
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "user.wallet_adjusted",
    targetType: "user",
    targetId: uid,
    details: `${delta >= 0 ? "Increased" : "Decreased"} ${userName}'s ${FIELD_LABELS[field]} by Rs ${Math.abs(delta)} (now Rs ${capturedNext})`,
  });
}
