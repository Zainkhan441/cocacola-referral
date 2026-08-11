import type { TaskRotationDoc, TaskRotationWriteInput } from "@/lib/firestore/task-rotations";
import { pakistanDateKey } from "@/lib/date-utils";

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type ComputeAssignmentInput = {
  existing: TaskRotationDoc | null;
  eligibleActiveTaskIds: string[];
  dailyTaskLimit: number;
  uid: string;
  now: Date;
  // Which of `existing.assignedTaskIds` the user actually completed since
  // that assignment was made — the caller resolves this from the real
  // taskCompletions records (see use-daily-tasks.ts), never from anything
  // self-reported on the rotation doc itself. Only consulted when moving to
  // a new day's assignment: this is the fold-in step that actually shrinks
  // remainingPoolTaskIds, which is what makes "no repeat until the whole
  // pool is exhausted" a real guarantee instead of a no-op — without it, a
  // completed task would stay in remainingPoolTaskIds forever and could be
  // redrawn the very next day.
  completedSinceLastAssignment?: string[];
};

// Pure function — no Firestore access — so it's trivially testable and
// reused identically by both the tasks page and any QA script. Returns
// null when no write is needed (today's assignment already exists and
// still overlaps the current eligible set closely enough to stand).
export function computeTodaysAssignment({
  existing,
  eligibleActiveTaskIds,
  dailyTaskLimit,
  uid,
  now,
  completedSinceLastAssignment = [],
}: ComputeAssignmentInput): TaskRotationWriteInput | null {
  const today = pakistanDateKey(now.getTime());
  const eligibleSet = new Set(eligibleActiveTaskIds);

  let cycleId = existing?.cycleId ?? 1;
  let completedThisCycle = new Set(existing?.completedThisCycleTaskIds ?? []);
  let remainingPool = new Set(existing?.remainingPoolTaskIds ?? []);

  if (!existing) {
    remainingPool = new Set(eligibleActiveTaskIds);
  } else {
    // Merge newly-created eligible tasks into the pool without disturbing
    // anything already known — this is what lets a freshly-created task
    // join rotation without resetting anyone's progress.
    for (const taskId of eligibleActiveTaskIds) {
      if (!remainingPool.has(taskId) && !completedThisCycle.has(taskId)) {
        remainingPool.add(taskId);
      }
    }

    // Fold in real completions from the previous assignment — only once,
    // right as we move past that stale day — before deciding whether the
    // pool is exhausted or drawing a fresh assignment.
    if (existing.assignedDate !== today) {
      for (const taskId of completedSinceLastAssignment) {
        remainingPool.delete(taskId);
        completedThisCycle.add(taskId);
      }
    }
  }

  if (existing && existing.assignedDate === today) {
    // Already assigned today — nothing to recompute. The caller still
    // gets back the merged pool state so newly-eligible tasks are
    // persisted even without a fresh assignment, but assignedTaskIds stays
    // exactly as already offered today.
    const remainingPoolChanged =
      remainingPool.size !== new Set(existing.remainingPoolTaskIds).size ||
      [...remainingPool].some((id) => !existing.remainingPoolTaskIds.includes(id));
    if (!remainingPoolChanged) return null;
    return {
      uid,
      cycleId,
      remainingPoolTaskIds: [...remainingPool],
      completedThisCycleTaskIds: [...completedThisCycle],
      assignedDate: existing.assignedDate,
      assignedTaskIds: existing.assignedTaskIds,
    };
  }

  const assigned: string[] = [];
  let pool = shuffle([...remainingPool].filter((id) => eligibleSet.has(id)));

  while (assigned.length < dailyTaskLimit) {
    if (pool.length === 0) {
      if (eligibleActiveTaskIds.length === 0) {
        // No eligible tasks exist at all — nothing to assign.
        break;
      }
      if (remainingPool.size === 0) {
        // Every eligible task has already been completed this cycle:
        // reshuffle into a fresh cycle and keep drawing from the full
        // eligible set.
        cycleId += 1;
        completedThisCycle = new Set();
        remainingPool = new Set(eligibleActiveTaskIds);
        pool = shuffle([...remainingPool].filter((id) => eligibleSet.has(id) && !assigned.includes(id)));
        if (pool.length === 0) break;
        continue;
      }
      // The still-fresh (not-yet-completed-this-cycle) pool alone can't
      // fill today's dailyTaskLimit — e.g. a package needing 8 tasks/day
      // with only 3 left in the current cycle. Top up today's assignment
      // from tasks already completed earlier this cycle instead of
      // under-assigning: offering one again today is fine, since it's
      // remainingPool/completedThisCycle (the multi-day no-repeat
      // bookkeeping) that must stay untouched here, not today's list.
      const topUp = shuffle(
        [...completedThisCycle].filter((id) => eligibleSet.has(id) && !assigned.includes(id)),
      );
      if (topUp.length === 0) break; // nothing left anywhere to add
      pool = topUp;
    }
    const next = pool.shift();
    if (next === undefined) break;
    if (!assigned.includes(next)) assigned.push(next);
  }

  return {
    uid,
    cycleId,
    remainingPoolTaskIds: [...remainingPool],
    completedThisCycleTaskIds: [...completedThisCycle],
    assignedDate: today,
    assignedTaskIds: assigned,
  };
}
