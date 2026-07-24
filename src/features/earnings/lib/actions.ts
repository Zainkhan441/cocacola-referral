import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { packageDocRef } from "@/lib/firestore/packages";
import { newDailyRewardRef, todayDateStringUtc } from "@/lib/firestore/daily-rewards";
import { newTransactionRef } from "@/lib/firestore/transactions";
import { isNewUtcDay } from "@/lib/date-utils";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

// Automatic, silent daily package earning — no user action triggers this; a
// dashboard-mounted effect calls it opportunistically for the signed-in
// user, and it's a harmless no-op whenever nothing is actually due (unlike
// the old manual "Claim" flow, ineligibility is never surfaced as an error).
// Every value written is re-derived from the caller's own current package
// inside the transaction (never trusted from a parameter), and
// firestore.rules independently re-validates the exact same formula and
// UTC calendar-day gate (canClaimDaily/isNewUtcDay) — so even a
// hand-crafted request bypassing this function entirely can't credit twice
// in the same UTC day or for a different amount. Credits Coca-Cola Earning
// only (never Current Balance/Staff Earning/Deposit). Returns the credited
// amount, or null if nothing was due this call.
export async function runAutomaticDailyEarning(uid: string): Promise<number | null> {
  const firestore = requireDb();
  const dailyRewardRef = newDailyRewardRef(firestore);
  const txnRef = newTransactionRef(firestore);

  let creditedAmount: number | null = null;

  await runTransaction(firestore, async (transaction) => {
    const userSnap = await transaction.get(userDocRef(firestore, uid));
    if (!userSnap.exists()) return;
    const user = userSnap.data();

    if (!user.package) return;

    const packageSnap = await transaction.get(packageDocRef(firestore, user.package));
    if (!packageSnap.exists() || !packageSnap.data().isActive) return;
    const pkg = packageSnap.data();

    if (!user.packageExpiresAt || Date.now() >= user.packageExpiresAt.toMillis()) return;

    if (user.lastDailyClaimAt && !isNewUtcDay(user.lastDailyClaimAt.toMillis(), Date.now())) {
      return;
    }

    const dailyEarning = pkg.dailyEarning;
    const newCocaColaEarning = user.cocaColaEarning + dailyEarning;
    const newTotalEarnings = user.totalEarnings + dailyEarning;
    const now = serverTimestamp();

    transaction.update(userDocRef(firestore, uid), {
      cocaColaEarning: newCocaColaEarning,
      totalEarnings: newTotalEarnings,
      todayEarnings: dailyEarning,
      lastDailyClaimAt: now,
      updatedAt: now,
    });

    transaction.update(walletDocRef(firestore, uid), {
      cocaColaEarning: newCocaColaEarning,
      totalEarnings: newTotalEarnings,
      updatedAt: now,
    });

    transaction.set(dailyRewardRef, {
      uid,
      packageId: user.package,
      amount: dailyEarning,
      rewardDate: todayDateStringUtc(),
      status: "claimed",
      createdAt: now,
    });

    transaction.set(txnRef, {
      uid,
      userName: user.fullName,
      type: "daily_reward",
      amount: dailyEarning,
      status: "completed",
      description: `Daily Coca-Cola earning from ${pkg.name}`,
      wallet: "cocaColaEarning",
      referenceId: dailyRewardRef.id,
      createdAt: now,
    });

    creditedAmount = dailyEarning;
  });

  return creditedAmount;
}
