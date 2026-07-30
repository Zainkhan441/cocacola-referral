import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { taskDocRef } from "@/lib/firestore/tasks";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { packageDocRef } from "@/lib/firestore/packages";
import { taskCompletionDocRef } from "@/lib/firestore/task-completions";
import { dailyTaskProgressDocRef } from "@/lib/firestore/daily-task-progress";
import {
  taskRewardSettingsDocRef,
  DEFAULT_TASK_REWARD_PER_AD,
  DEFAULT_MINIMUM_WATCH_SECONDS,
} from "@/lib/firestore/settings";
import { dailyRewardDocRef } from "@/lib/firestore/daily-rewards";
import { newTransactionRef } from "@/lib/firestore/transactions";
import { setAutoBalanceAfterAds } from "@/lib/firestore/users";
import { isNewPakistanDay, pakistanDateKey } from "@/lib/date-utils";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

// Marks (or re-marks, for a new Pakistan day) the moment a user opened this
// task's video. Safe to call every time the player mounts — a same-day
// re-call is a harmless no-op re-write of the same startedAt. Every value
// re-derived from the task's own current document inside the transaction;
// firestore.rules independently re-validates eligibility and the
// create-vs-reset distinction, so a hand-crafted request can't fake an
// earlier startedAt to shortcut the watch floor. Callers MUST await this
// before starting any local watch-time accumulation — starting a countdown
// from mount time rather than from the confirmed server startedAt previously
// caused a race where completeTaskWatch could fire slightly before the
// real, server-recorded floor had elapsed.
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
      if (!isNewPakistanDay(existing.completedAt.toMillis(), Date.now())) {
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

// PHASE 4 FINAL RULE: watching an ad only RECORDS completion — no money
// moves here at all. Marks the task complete for today and bumps the
// user's daily distinct-task counter, atomically. firestore.rules
// independently re-derives the watch-time floor from the task-completions
// doc's own startedAt (never trusted from this call), so this can only
// succeed once real time has genuinely elapsed. All money moves through
// the separate bundled claimDailyTaskReward below — manual or automatic,
// but always that one function, never here.
export async function completeTaskWatch(uid: string, taskId: string): Promise<void> {
  const firestore = requireDb();

  await runTransaction(firestore, async (transaction) => {
    const completionRef = taskCompletionDocRef(firestore, uid, taskId);
    const completionSnap = await transaction.get(completionRef);
    if (!completionSnap.exists()) {
      throw new Error("Start watching before completing this task.");
    }
    const completion = completionSnap.data();
    if (completion.completedAt != null && !isNewPakistanDay(completion.completedAt.toMillis(), Date.now())) {
      throw new Error("You've already completed this task today.");
    }

    const rewardSettingsSnap = await transaction.get(taskRewardSettingsDocRef(firestore));
    const rewardSettings = rewardSettingsSnap.exists() ? rewardSettingsSnap.data() : null;
    const minimumWatchSeconds = rewardSettings?.minimumWatchSeconds ?? DEFAULT_MINIMUM_WATCH_SECONDS;

    const elapsedMs = Date.now() - completion.startedAt.toMillis();
    if (elapsedMs < minimumWatchSeconds * 1000) {
      throw new Error(`Please watch at least ${minimumWatchSeconds} seconds before this task completes.`);
    }

    const progressRef = dailyTaskProgressDocRef(firestore, uid);
    const progressSnap = await transaction.get(progressRef);
    const progress = progressSnap.exists() ? progressSnap.data() : null;
    const progressIsToday = progress != null && !isNewPakistanDay(progress.windowStartAt.toMillis(), Date.now());

    // Recorded even beyond the package's daily requirement (e.g. the active
    // pool has more tasks than the package needs) — the task itself always
    // shows as "done" so the user isn't stuck; claimDailyTaskReward is what
    // actually bounds claimable money to the package's own dailyTaskLimit,
    // never this counter.
    transaction.update(completionRef, { completedAt: serverTimestamp() });
    if (progressIsToday) {
      transaction.update(progressRef, { count: progress!.count + 1 });
    } else {
      transaction.set(progressRef, { uid, count: 1, windowStartAt: serverTimestamp() });
    }
  });
}

export type ClaimDailyTaskRewardResult = {
  taskReward: number;
  packageEarning: number;
};

// The bundled claim: pays the sum of every completed required ad's flat
// reward (dailyTaskLimit × the live global settings/taskRewards.rewardPerAd)
// and the package's own daily earning TOGETHER, atomically, once — only
// once every required task has genuinely been completed today. Called
// either from a manual "Claim Reward" click (autoBalanceAfterAds == false)
// or automatically the instant the quota is met (autoBalanceAfterAds ==
// true) — both paths call this exact same function, gated by the exact
// same firestore.rules check, so neither mode can ever credit twice for the
// same Pakistan day, and a race between the two (e.g. toggling Auto on in
// one tab while a manual claim is in flight in another) resolves safely:
// whichever transaction commits first wins, the second's fresh read of
// lastDailyClaimAt causes its own rule check to fail.
export async function claimDailyTaskReward(uid: string): Promise<ClaimDailyTaskRewardResult> {
  const firestore = requireDb();
  const dailyRewardTxnRefTaskReward = newTransactionRef(firestore);
  const dailyRewardTxnRefDailyReward = newTransactionRef(firestore);

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

    if (user.lastDailyClaimAt && !isNewPakistanDay(user.lastDailyClaimAt.toMillis(), Date.now())) {
      throw new Error("Today's reward has already been claimed.");
    }

    const dailyTaskLimit = user.packageDailyTaskLimit ?? pkg.dailyTaskLimit;

    const progressSnap = await transaction.get(dailyTaskProgressDocRef(firestore, uid));
    const progress = progressSnap.exists() ? progressSnap.data() : null;
    const progressIsToday = progress != null && !isNewPakistanDay(progress.windowStartAt.toMillis(), Date.now());
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
    const now = serverTimestamp();
    const dateKey = pakistanDateKey(Date.now());

    const newCurrentBalance = user.currentBalance + taskReward;
    const newCocaColaEarning = user.cocaColaEarning + packageEarning;
    const newTotalEarnings = user.totalEarnings + totalToday;

    // Deterministic id ({uid}_{dateKey}_{packageId}) — this document's mere
    // existence IS the idempotency guard for the package-earning half of
    // this claim; a retried/duplicated/racing claim attempt for the same
    // Pakistan day can never create a second one.
    const dailyRewardRef = dailyRewardDocRef(firestore, uid, dateKey, user.package);

    // Every write below EXCEPT the users/{uid} update itself is issued
    // first, deliberately: firestore.rules re-derives each write's own
    // eligibility via a fresh userData(uid)/get() call, and within a single
    // transaction, get() always reads the transaction's initial (pre-write)
    // snapshot — never an earlier write to a different document already
    // issued in this same transaction. If the users/{uid} write (which sets
    // lastDailyClaimAt to "now") were issued first, every sibling write's
    // fresh read would see that brand-new value and its own
    // isNewPakistanDay/canClaimDaily check would compare "now" against
    // "now" — always false, permission-denied. Issuing users/{uid} LAST
    // sidesteps this entirely.
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
      rewardDate: dateKey,
      status: "claimed",
      createdAt: now,
    });

    transaction.set(dailyRewardTxnRefTaskReward, {
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
    transaction.set(dailyRewardTxnRefDailyReward, {
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

    // Issued LAST — see the comment above.
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

// Toggles autoBalanceAfterAds. Turning it on doesn't itself credit
// anything — use-daily-tasks.ts's own effect reacts to the resulting
// profile change and fires claimDailyTaskReward if the user is already
// eligible (all required ads done today) and hasn't claimed yet.
export async function setAutoBalancePreference(uid: string, enabled: boolean): Promise<void> {
  const firestore = requireDb();
  await setAutoBalanceAfterAds(firestore, uid, enabled);
}
