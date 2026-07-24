import { doc, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TASK_COOLDOWNS_PATH = "taskCooldowns";

// One document per (uid, taskId) pair, doc id `${uid}_${taskId}` — the sole
// rules-enforceable gate for "one daily-task completion per rolling 24h
// window", mirroring users/{uid}.lastDailyClaimAt's role for the single
// platform-wide daily earning claim. A dedicated collection (rather than a
// map field on users/{uid}) is used because there can be many different
// daily tasks, and Firestore rules can't validate "only this one dynamic map
// key changed" generically — a deterministic per-pair document keeps the
// same diff().affectedKeys() pattern used everywhere else in this schema.
// Only relevant to "daily" frequency tasks; "one_time" tasks are guarded
// instead by a deterministic submission doc id (see task-submissions.ts).
export type TaskCooldownDoc = {
  uid: string;
  taskId: string;
  lastSubmittedAt: Timestamp;
};

export function taskCooldownsCollection(db: Firestore) {
  return typedCollection<TaskCooldownDoc>(db, TASK_COOLDOWNS_PATH);
}

export function taskCooldownDocRef(db: Firestore, uid: string, taskId: string) {
  return doc(taskCooldownsCollection(db), `${uid}_${taskId}`);
}
