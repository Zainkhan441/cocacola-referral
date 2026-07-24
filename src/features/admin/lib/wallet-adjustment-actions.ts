import { runTransaction, serverTimestamp } from "firebase/firestore";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export type AdjustableWalletField = "currentBalance" | "cocaColaEarning" | "staffEarning";

const FIELD_LABELS: Record<AdjustableWalletField, string> = {
  currentBalance: "Current Balance",
  cocaColaEarning: "Coca-Cola Earning",
  staffEarning: "Staff Earning",
};

// Admin manual wallet adjustment: increase or decrease exactly one of the
// three earning wallets for one user — never walletBalance (the Deposit
// Wallet, reserved for top-ups only) — writing both users/{uid} and the
// mirrored wallets/{uid} atomically. `delta` may be negative (decrease) or
// positive (increase); the resulting balance can never go below 0, checked
// here AND independently re-enforced by firestore.rules adminCanUpdateUser.
export async function adjustUserWalletAction(
  uid: string,
  userName: string,
  field: AdjustableWalletField,
  delta: number,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
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
