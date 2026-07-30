"use client";

import { useEffect, useMemo, useState } from "react";
import { getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { TaskDoc } from "@/lib/firestore/tasks";
import type { UserDoc } from "@/lib/firestore/users";
import type { PackageDoc } from "@/lib/firestore/packages";
import {
  getTaskRotation,
  setTaskRotation,
  taskRotationDocRef,
  type TaskRotationDoc,
} from "@/lib/firestore/task-rotations";
import { taskCompletionDocRef, type TaskCompletionDoc } from "@/lib/firestore/task-completions";
import { dailyTaskProgressDocRef, type DailyTaskProgressDoc } from "@/lib/firestore/daily-task-progress";
import { computeTodaysAssignment } from "@/features/tasks/lib/rotation";
import { claimDailyTaskReward } from "@/features/tasks/lib/actions";
import { isNewPakistanDay, pakistanDateKey } from "@/lib/date-utils";

type UseDailyTasksResult = {
  loading: boolean;
  error: string | null;
  assignedTasks: TaskDoc[];
  completions: Record<string, TaskCompletionDoc | undefined>;
  completedTodayCount: number;
  requiredCount: number;
  allDoneToday: boolean;
  // Whether today's bundled reward (task rewards + package earning) has
  // already been claimed — gates both the manual button and the automatic
  // claim effect below.
  alreadyClaimedToday: boolean;
  claiming: boolean;
  claimError: string | null;
  // Manual mode entry point (autoBalanceAfterAds == false): call from the
  // "Claim Reward" button's onClick. Safe to call even when not eligible —
  // it no-ops (see the guard at the top of claim()).
  claim: () => Promise<void>;
  // Live-updating Pakistan-time clock (ms since epoch) — exposed so
  // consumers (e.g. TaskRotationList's per-task "completed today" check)
  // share this exact same clock instead of keeping their own stale
  // mount-time snapshot, which would otherwise silently miss a midnight
  // rollover while the tab stays open.
  now: number;
  // The SAME live eligibility check this hook already computes internally
  // to decide what to assign (task.status === "active", within its date
  // window, package-eligible — see eligibleActiveTaskIds above) — exposed
  // read-only so the UI can tell whether an already-assigned task has since
  // become unavailable (admin disabled it, its window closed, etc.) and
  // show it as locked. Purely a read of existing state; nothing about
  // assignment, completion, or claim logic changes by exposing this.
  eligibleActiveTaskIds: string[];
};

function isEligible(task: TaskDoc, profile: UserDoc, packageInfo: PackageDoc | null): boolean {
  if (!profile.package) return false;
  if (task.requiredPackageId && profile.package !== task.requiredPackageId) return false;
  if (task.minPackagePrice != null && (packageInfo?.price ?? 0) < task.minPackagePrice) return false;
  return true;
}

export function useDailyTasks(
  uid: string | undefined,
  profile: UserDoc | null,
  packageInfo: PackageDoc | null,
  allTasks: TaskDoc[],
  tasksLoading: boolean,
): UseDailyTasksResult {
  const [rotation, setRotationState] = useState<TaskRotationDoc | null>(null);
  const [rotationLoading, setRotationLoading] = useState(true);
  const [progress, setProgress] = useState<DailyTaskProgressDoc | null>(null);
  const [completions, setCompletions] = useState<Record<string, TaskCompletionDoc | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Live-updating, not a one-time mount snapshot — the actual enforcement
  // is server-side (firestore.rules), this is just UI gating, but it must
  // still notice a Pakistan-midnight rollover on its own: a tab left open
  // (or asleep) across midnight needs to see Watch buttons return and
  // progress reset WITHOUT a manual reload. A 60s interval catches an
  // open, active tab; the visibilitychange listener catches a tab that was
  // backgrounded/asleep and gets reopened well after midnight has passed.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  const todayKey = pakistanDateKey(now);
  const dailyTaskLimit = profile?.packageDailyTaskLimit ?? packageInfo?.dailyTaskLimit ?? 0;

  const eligibleActiveTaskIds = useMemo(() => {
    if (!profile) return [];
    return allTasks
      .filter((task) => task.status === "active")
      .filter((task) => now >= task.startDate.toMillis() && (!task.endDate || now <= task.endDate.toMillis()))
      .filter((task) => isEligible(task, profile, packageInfo))
      .map((task) => task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, profile, packageInfo]);

  // Ensure today's assignment exists (or newly-eligible tasks are merged
  // in), then subscribe to the rotation doc for live updates.
  useEffect(() => {
    if (!db || !uid || tasksLoading || !profile) return;
    const firestore = db;
    let cancelled = false;

    (async () => {
      try {
        const existing = await getTaskRotation(firestore, uid);
        const now = new Date();

        // Resolve which of the previous assignment's tasks were actually
        // completed — the real fold-in source for shrinking the rotation
        // pool (see rotation.ts) — only needed when moving past a stale
        // assignedDate, never on a same-day re-check.
        let completedSinceLastAssignment: string[] = [];
        if (existing && existing.assignedDate !== pakistanDateKey(now.getTime()) && existing.assignedTaskIds.length > 0) {
          const completionSnaps = await Promise.all(
            existing.assignedTaskIds.map((taskId) => getDoc(taskCompletionDocRef(firestore, uid, taskId))),
          );
          completedSinceLastAssignment = existing.assignedTaskIds.filter((_, index) => {
            const snap = completionSnaps[index];
            return snap.exists() && snap.data().completedAt != null;
          });
        }

        const next = computeTodaysAssignment({
          existing,
          eligibleActiveTaskIds,
          dailyTaskLimit: dailyTaskLimit || 1,
          uid,
          now,
          completedSinceLastAssignment,
        });
        if (next) await setTaskRotation(firestore, next);
        if (!cancelled) setRotationLoading(false);
      } catch {
        if (!cancelled) {
          setError("We couldn’t load today’s tasks. Please try again.");
          setRotationLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // todayKey is deliberately included: it's how a Pakistan-midnight
    // rollover (from the live `now` state above) re-triggers this effect to
    // fetch tomorrow's assignment, without needing a manual reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, tasksLoading, profile, eligibleActiveTaskIds.join(","), dailyTaskLimit, todayKey]);

  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(taskRotationDocRef(db, uid), (snap) => {
      setRotationState(snap.exists() ? snap.data() : null);
    });
  }, [uid]);

  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(dailyTaskProgressDocRef(db, uid), (snap) => {
      setProgress(snap.exists() ? snap.data() : null);
    });
  }, [uid]);

  const assignedTaskIds = useMemo(() => rotation?.assignedTaskIds ?? [], [rotation]);

  useEffect(() => {
    if (!db || !uid || assignedTaskIds.length === 0) return;
    const firestore = db;
    const unsubscribes = assignedTaskIds.map((taskId) =>
      onSnapshot(taskCompletionDocRef(firestore, uid, taskId), (snap) => {
        setCompletions((prev) => ({ ...prev, [taskId]: snap.exists() ? snap.data() : undefined }));
      }),
    );
    return () => unsubscribes.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, assignedTaskIds.join(",")]);

  const assignedTasks = useMemo(
    () => assignedTaskIds.map((id) => allTasks.find((task) => task.id === id)).filter((t): t is TaskDoc => Boolean(t)),
    [assignedTaskIds, allTasks],
  );

  const completedTodayCount = assignedTaskIds.filter((id) => {
    const completion = completions[id];
    return completion?.completedAt != null && !isNewPakistanDay(completion.completedAt.toMillis(), now);
  }).length;

  const progressIsToday = progress != null && !isNewPakistanDay(progress.windowStartAt.toMillis(), now);
  const allDoneToday =
    assignedTaskIds.length > 0 && completedTodayCount >= assignedTaskIds.length && progressIsToday;

  const alreadyClaimedToday = Boolean(
    profile?.lastDailyClaimAt && !isNewPakistanDay(profile.lastDailyClaimAt.toMillis(), now),
  );

  async function claim() {
    if (!uid || claiming || alreadyClaimedToday || !allDoneToday) return;
    setClaimError(null);
    setClaiming(true);
    try {
      await claimDailyTaskReward(uid);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Couldn’t claim today’s reward.");
    } finally {
      setClaiming(false);
    }
  }

  // Auto Balance mode (Phase 4, section 5): existing docs predating this
  // field are always read as `?? false` — never assumed present — so an
  // old account without autoBalanceAfterAds correctly stays in manual mode.
  // This effect ALSO covers "enabling Auto after all ads are already
  // completed": since autoBalanceAfterAds is a dependency, flipping it on
  // re-runs the effect, and if allDoneToday && !alreadyClaimedToday already
  // hold at that moment, the claim fires immediately — no separate code
  // path needed for that case. Safe to fire more than once — claim() itself
  // is idempotent (guarded by `claiming`/`alreadyClaimedToday`, and the
  // underlying transaction independently re-checks lastDailyClaimAt
  // server-side), so re-running this effect can never double-credit.
  const autoBalanceEnabled = profile?.autoBalanceAfterAds ?? false;
  useEffect(() => {
    if (!(autoBalanceEnabled && allDoneToday && !alreadyClaimedToday && !claiming)) return;
    // claim() sets state synchronously at its very start (setClaiming(true),
    // etc.) — deferred to a microtask so that state update happens outside
    // this effect's own synchronous execution, not directly within it.
    const microtask = Promise.resolve().then(() => claim());
    void microtask;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBalanceEnabled, allDoneToday, alreadyClaimedToday, claiming]);

  return {
    loading: tasksLoading || rotationLoading,
    error,
    assignedTasks,
    completions,
    completedTodayCount,
    requiredCount: assignedTaskIds.length,
    allDoneToday,
    alreadyClaimedToday,
    claiming,
    claimError,
    claim,
    now,
    eligibleActiveTaskIds,
  };
}
