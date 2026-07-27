import { doc, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TASK_COMPLETIONS_PATH = "taskCompletions";

// One document per (uid, taskId) pair, doc id `${uid}_${taskId}` — reused
// across every calendar day (never a new doc per day), the same "stable id,
// day-aware reset via isNewUtcDay" idiom already used by
// users/{uid}.lastDailyClaimAt, just scoped to one task instead of one
// user. Two-phase lifecycle, both phases enforced entirely in
// firestore.rules (this app has no server, so rules ARE the trust
// boundary — see PROJECT_STATE.md):
//   1. Start — created (or reset, if completedAt is from an earlier UTC
//      day) the moment a user opens this task's video. completedAt is
//      always null right after a Start.
//   2. Complete — completedAt is set once the user's player reports the
//      video ended (or, for platforms with no reliable end-event, once a
//      10-second minimum-watch timer elapses) AND at least 10 real
//      wall-clock seconds have passed since startedAt — the actual
//      rules-enforced anti-instant-click floor. Can only happen once per
//      UTC day per task; the SAME transaction that sets completedAt also
//      increments dailyTaskProgress/{uid} (see daily-task-progress.ts),
//      which is what the final reward claim actually reads.
export type TaskCompletionDoc = {
  uid: string;
  taskId: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
};

export function taskCompletionsCollection(db: Firestore) {
  return typedCollection<TaskCompletionDoc>(db, TASK_COMPLETIONS_PATH);
}

export function taskCompletionDocRef(db: Firestore, uid: string, taskId: string) {
  return doc(taskCompletionsCollection(db), `${uid}_${taskId}`);
}
