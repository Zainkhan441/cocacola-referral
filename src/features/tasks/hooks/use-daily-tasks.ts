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
import { computeTodaysAssignment, utcDateKey } from "@/features/tasks/lib/rotation";
import { claimDailyTaskReward } from "@/features/tasks/lib/actions";
import { isNewUtcDay } from "@/lib/date-utils";

type UseDailyTasksResult = {
  loading: boolean;
  error: string | null;
  assignedTasks: TaskDoc[];
  completions: Record<string, TaskCompletionDoc | undefined>;
  completedTodayCount: number;
  requiredCount: number;
  allDoneToday: boolean;
  alreadyClaimedToday: boolean;
  claiming: boolean;
  claimError: string | null;
  claim: () => Promise<void>;
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

  // One-time snapshot at mount, not re-read on every render — the actual
  // enforcement is server-side (firestore.rules), this is just UI gating.
  const [now] = useState(() => Date.now());
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
        if (existing && existing.assignedDate !== utcDateKey(now) && existing.assignedTaskIds.length > 0) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, tasksLoading, profile, eligibleActiveTaskIds.join(","), dailyTaskLimit]);

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
    return completion?.completedAt != null && !isNewUtcDay(completion.completedAt.toMillis(), now);
  }).length;

  const progressIsToday = progress != null && !isNewUtcDay(progress.windowStartAt.toMillis(), now);
  const allDoneToday =
    assignedTaskIds.length > 0 && completedTodayCount >= assignedTaskIds.length && progressIsToday;

  const alreadyClaimedToday = Boolean(
    profile?.lastDailyClaimAt && !isNewUtcDay(profile.lastDailyClaimAt.toMillis(), now),
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
  };
}
