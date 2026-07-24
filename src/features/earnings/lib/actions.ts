import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { packageDocRef } from "@/lib/firestore/packages";
import { newDailyRewardRef, todayDateStringUtc } from "@/lib/firestore/daily-rewards";
import { newTransactionRef } from "@/lib/firestore/transactions";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Self-service: the caller's own client runs this transaction. Every value
// written is re-derived from the caller's own current package inside the
// transaction (never trusted from a parameter), and firestore.rules
// independently re-validates the exact same formula and cooldown — so even
// a hand-crafted request bypassing this function entirely can't claim
// early or for a different amount. Returns the claimed amount for the
// success message.
export async function claimDailyEarning(uid: string): Promise<number> {
  const firestore = requireDb();
  const dailyRewardRef = newDailyRewardRef(firestore);
  const txnRef = newTransactionRef(firestore);

  let claimedAmount = 0;

  await runTransaction(firestore, async (transaction) => {
    const userSnap = await transaction.get(userDocRef(firestore, uid));
    if (!userSnap.exists()) {
      throw new Error("Your profile could not be found.");
    }
    const user = userSnap.data();

    if (!user.package) {
      throw new Error("You need an active package to claim daily earnings.");
    }

    const packageSnap = await transaction.get(packageDocRef(firestore, user.package));
    if (!packageSnap.exists() || !packageSnap.data().isActive) {
      throw new Error("Your package's daily claims are currently paused.");
    }
    const pkg = packageSnap.data();

    if (!user.packageExpiresAt || Date.now() >= user.packageExpiresAt.toMillis()) {
      throw new Error("Your package has expired. Please renew it to keep claiming.");
    }

    if (user.lastDailyClaimAt) {
      const nextClaimAtMs = user.lastDailyClaimAt.toMillis() + CLAIM_COOLDOWN_MS;
      if (Date.now() < nextClaimAtMs) {
        throw new Error("You’ve already claimed today. Please check back later.");
      }
    }

    const dailyEarning = pkg.dailyEarning;
    const newWalletBalance = user.walletBalance + dailyEarning;
    const newTotalEarnings = user.totalEarnings + dailyEarning;
    const now = serverTimestamp();

    transaction.update(userDocRef(firestore, uid), {
      walletBalance: newWalletBalance,
      totalEarnings: newTotalEarnings,
      todayEarnings: dailyEarning,
      lastDailyClaimAt: now,
      updatedAt: now,
    });

    transaction.update(walletDocRef(firestore, uid), {
      balance: newWalletBalance,
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
      type: "daily_reward",
      amount: dailyEarning,
      status: "completed",
      description: `Daily earning from ${pkg.name}`,
      createdAt: now,
    });

    claimedAmount = dailyEarning;
  });

  return claimedAmount;
}
