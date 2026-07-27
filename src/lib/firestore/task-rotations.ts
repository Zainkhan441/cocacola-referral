import { doc, getDoc, setDoc, serverTimestamp, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TASK_ROTATIONS_PATH = "taskRotations";

// One document per user, doc id == uid — the day-to-day "which ads are
// offered today, and which have I already completed at least once since
// the pool last reshuffled" state. Deliberately NOT part of the financial
// trust boundary: firestore.rules only does light shape validation here
// (owner-only, array-of-strings, reasonable size caps) and NO money logic
// anywhere ever reads this document. Tampering with your own rotation
// state can only change which tasks you personally see next — never forge
// a reward, since the actual claim (see daily-task-progress.ts /
// firestore.rules' task-reward claim branch) independently re-derives
// truth from real per-task taskCompletions records, never from this doc's
// self-reported arrays. See PROJECT_STATE.md for the full reasoning.
export type TaskRotationDoc = {
  uid: string;
  // Increments every time remainingPoolTaskIds is fully exhausted (every
  // eligible-active task completed at least once) and a fresh cycle
  // begins — informational only, shown in the UI, not used by any rule.
  cycleId: number;
  // Eligible-active task ids not yet completed THIS cycle. Assignment
  // draws from this set without removing anything; only an actual
  // completion (task-completions.ts) moves an id from here into
  // completedThisCycleTaskIds. Newly-created eligible tasks are merged in
  // here as they appear, without disturbing anything already present.
  remainingPoolTaskIds: string[];
  completedThisCycleTaskIds: string[];
  // "YYYY-MM-DD"-shaped, informational only — which day assignedTaskIds
  // was computed for. Not read by any rule; recomputation is keyed off the
  // real current UTC date computed client-side, not off trusting this
  // field for anything financial.
  assignedDate: string;
  assignedTaskIds: string[];
  updatedAt: Timestamp;
};

export function taskRotationsCollection(db: Firestore) {
  return typedCollection<TaskRotationDoc>(db, TASK_ROTATIONS_PATH);
}

export function taskRotationDocRef(db: Firestore, uid: string) {
  return doc(taskRotationsCollection(db), uid);
}

export async function getTaskRotation(db: Firestore, uid: string): Promise<TaskRotationDoc | null> {
  const snapshot = await getDoc(taskRotationDocRef(db, uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export type TaskRotationWriteInput = {
  uid: string;
  cycleId: number;
  remainingPoolTaskIds: string[];
  completedThisCycleTaskIds: string[];
  assignedDate: string;
  assignedTaskIds: string[];
};

export async function setTaskRotation(db: Firestore, input: TaskRotationWriteInput): Promise<void> {
  await setDoc(taskRotationDocRef(db, input.uid), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
