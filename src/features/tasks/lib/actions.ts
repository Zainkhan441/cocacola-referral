import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { taskDocRef } from "@/lib/firestore/tasks";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { packageDocRef } from "@/lib/firestore/packages";
import { taskCompletionDocRef } from "@/lib/firestore/task-completions";
import { dailyTaskProgressDocRef } from "@/lib/firestore/daily-task-progress";
import { taskRewardSettingsDocRef, DEFAULT_TASK_REWARD_PER_AD } from "@/lib/firestore/settings";
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

// Minimum real wall-clock seconds required between a task's Start and its
// Complete — the actual rules-enforced anti-instant-click floor, uniform
// across every video platform (see task-completions.ts). Kept as a
// constant here purely so the client can pre-emptively disable the
// Complete button instead of always round-tripping to Firestore to
// discover it was too early.
export const TASK_MIN_WATCH_SECONDS = 10;

// Marks (or re-marks, for a new UTC day) the moment a user opened this
// task's video. Safe to call every time the player mounts — a same-day
// re-call is a harmless no-op re-write of the same startedAt. Every value
// re-derived from the task's own current document inside the transaction;
// firestore.rules independently re-validates eligibility and the
// create-vs-reset distinction, so a hand-crafted request can't fake an
// earlier startedAt to shortcut the watch floor.
export async function startTaskWatch(uid: string, taskId: string): Promise<void> {
  const firestore = requireDb();

  await runTransaction(firestore, async (transaction) => {
    const taskSnap = await transaction.get(taskDocRef(firestore, taskId));
    if (!taskSnap.exists() || taskSnap.data().status !== "active") {
      throw new Error("This task is not currently available.");
    }

    const completionRef = taskCompletionDocRef(firestore, uid, taskId);
    const completionSnap = await transaction.get(completionRef);

    if (completionSnap.exists()) {
      const existing = completionSnap.data();
      if (existing.completedAt == null) {
        // Already started today (or a previous day, still uncompleted) —
        // nothing to do; re-writing the same startedAt would be a no-op at
        // best and is disallowed by rules for an already-null completedAt.
        return;
      }
      if (!isNewUtcDay(existing.completedAt.toMillis(), Date.now())) {
        // Already completed today — starting again is meaningless until
        // tomorrow.
        return;
      }
    }

    transaction.set(completionRef, {
      uid,
      taskId,
      startedAt: serverTimestamp(),
      completedAt: null,
    });
  });
}

// Marks a task complete for today and bumps the user's daily progress
// counter, atomically. Rules independently re-derive the watch-time floor
// from the task-completions doc's own startedAt (never trusted from this
// call), so this can only succeed once real time has actually elapsed.
export async function completeTaskWatch(uid: string, taskId: string): Promise<void> {
  const firestore = requireDb();

  await runTransaction(firestore, async (transaction) => {
    const completionRef = taskCompletionDocRef(firestore, uid, taskId);
    const completionSnap = await transaction.get(completionRef);
    if (!completionSnap.exists()) {
      throw new Error("Start watching before marking this task complete.");
    }
    const completion = completionSnap.data();
    if (completion.completedAt != null && !isNewUtcDay(completion.completedAt.toMillis(), Date.now())) {
      throw new Error("You've already completed this task today.");
    }
    const elapsedMs = Date.now() - completion.startedAt.toMillis();
    if (elapsedMs < TASK_MIN_WATCH_SECONDS * 1000) {
      throw new Error("Please watch a little longer before completing this task.");
    }

    const progressRef = dailyTaskProgressDocRef(firestore, uid);
    const progressSnap = await transaction.get(progressRef);
    const progress = progressSnap.exists() ? progressSnap.data() : null;
    const progressIsToday = progress != null && !isNewUtcDay(progress.windowStartAt.toMillis(), Date.now());

    transaction.update(completionRef, { completedAt: serverTimestamp() });

    if (progressIsToday) {
      transaction.update(progressRef, { count: progress!.count + 1 });
    } else {
      transaction.set(progressRef, { uid, count: 1, windowStartAt: serverTimestamp() });
    }
  });
}

type ClaimDailyTaskRewardResult = {
  taskReward: number;
  packageEarning: number;
};

// The all-or-nothing bundled claim: pays the flat per-ad task reward
// (requiredTasks × the live global settings/taskRewards.rewardPerAd) and
// the package's own daily earning TOGETHER, once, only once every required
// task has genuinely been completed today. Every amount is re-derived here
// from trusted documents (never a parameter), and firestore.rules
// independently re-validates the exact same formulas plus the one-claim-
// per-UTC-day gate (reusing users/{uid}.lastDailyClaimAt/isNewUtcDay,
// exactly as the retired automatic daily-claim did) — so a hand-crafted
// request can't claim early, twice, or for a forged amount.
export async function claimDailyTaskReward(uid: string): Promise<ClaimDailyTaskRewardResult> {
  const firestore = requireDb();
  const dailyRewardRef = newDailyRewardRef(firestore);
  const taskRewardTxnRef = newTransactionRef(firestore);
  const dailyRewardTxnRef = newTransactionRef(firestore);

  let taskRewardCredited = 0;
  let packageEarningCredited = 0;

  await runTransaction(firestore, async (transaction) => {
    const userSnap = await transaction.get(userDocRef(firestore, uid));
    if (!userSnap.exists()) throw new Error("Your profile could not be found.");
    const user = userSnap.data();

    if (!user.package) throw new Error("You need an active package to claim today's reward.");
    const packageSnap = await transaction.get(packageDocRef(firestore, user.package));
    if (!packageSnap.exists()) throw new Error("Your package is not currently eligible.");
    const pkg = packageSnap.data();

    if (user.lastDailyClaimAt && !isNewUtcDay(user.lastDailyClaimAt.toMillis(), Date.now())) {
      throw new Error("Today's reward has already been claimed.");
    }

    const dailyTaskLimit = user.packageDailyTaskLimit ?? pkg.dailyTaskLimit;

    const progressSnap = await transaction.get(dailyTaskProgressDocRef(firestore, uid));
    const progress = progressSnap.exists() ? progressSnap.data() : null;
    const progressIsToday = progress != null && !isNewUtcDay(progress.windowStartAt.toMillis(), Date.now());
    if (!progressIsToday || progress!.count < dailyTaskLimit) {
      throw new Error("Complete all of today's assigned tasks before claiming your reward.");
    }

    const rewardSettingsSnap = await transaction.get(taskRewardSettingsDocRef(firestore));
    const rewardPerAd = rewardSettingsSnap.exists()
      ? rewardSettingsSnap.data().rewardPerAd
      : DEFAULT_TASK_REWARD_PER_AD;

    const taskReward = dailyTaskLimit * rewardPerAd;
    const packageEarning = user.packageDailyEarning ?? pkg.dailyEarning;
    const totalToday = taskReward + packageEarning;

    const newCurrentBalance = user.currentBalance + taskReward;
    const newCocaColaEarning = user.cocaColaEarning + packageEarning;
    const newTotalEarnings = user.totalEarnings + totalToday;
    const now = serverTimestamp();

    // Every write below EXCEPT the users/{uid} update itself is issued
    // first, deliberately: firestore.rules re-derives each write's own
    // eligibility via a fresh userData(uid)/get() call (wallets, dailyRewards,
    // and both transactions ledger entries all lack their own
    // lastDailyClaimAt field, so they must re-read the user profile) — and
    // within a single transaction, a rule's get() on a document reflects any
    // earlier write to that SAME document already issued earlier in this same
    // transaction. If the users/{uid} write (which sets lastDailyClaimAt to
    // "now") were issued first, every one of these siblings' fresh reads
    // would see that brand-new "now" value and their own isNewUtcDay/
    // canClaimDaily checks would compare "now" against "now" — always false,
    // permission-denied. Issuing users/{uid} LAST sidesteps this entirely.
    transaction.update(walletDocRef(firestore, uid), {
      currentBalance: newCurrentBalance,
      cocaColaEarning: newCocaColaEarning,
      totalEarnings: newTotalEarnings,
      updatedAt: now,
    });

    transaction.set(dailyRewardRef, {
      uid,
      packageId: user.package,
      amount: packageEarning,
      rewardDate: todayDateStringUtc(),
      status: "claimed",
      createdAt: now,
    });

    transaction.set(taskRewardTxnRef, {
      uid,
      userName: user.fullName,
      type: "task_reward",
      amount: taskReward,
      status: "completed",
      description: `Ad task reward — ${dailyTaskLimit} task(s) completed today`,
      wallet: "currentBalance",
      referenceId: dailyRewardRef.id,
      createdAt: now,
    });
    transaction.set(dailyRewardTxnRef, {
      uid,
      userName: user.fullName,
      type: "daily_reward",
      amount: packageEarning,
      status: "completed",
      description: `Daily Coca-Cola earning from ${pkg.name}`,
      wallet: "cocaColaEarning",
      referenceId: dailyRewardRef.id,
      createdAt: now,
    });

    // Issued LAST — see the comment above the wallet write for why.
    transaction.update(userDocRef(firestore, uid), {
      currentBalance: newCurrentBalance,
      cocaColaEarning: newCocaColaEarning,
      totalEarnings: newTotalEarnings,
      todayEarnings: totalToday,
      lastDailyClaimAt: now,
      updatedAt: now,
    });

    taskRewardCredited = taskReward;
    packageEarningCredited = packageEarning;
  });

  return { taskReward: taskRewardCredited, packageEarning: packageEarningCredited };
}
