import {
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TASKS_PATH = "tasks";

export type TaskStatus = "active" | "disabled" | "archived";

// Admin-managed task definitions. Any signed-in user may read them (needed
// to browse the Tasks page and to resolve their own eligibility); only an
// admin may write. Never deleted — disabled/archived instead — so an old
// taskCompletions/taskRotations reference always resolves to a real
// document. There is no per-task reward, frequency, or proof-screenshot
// field anymore — every task pays the single global reward
// (settings/taskRewards.rewardPerAd, read live at claim time) and is
// completed by watching its video to the end (see
// src/lib/firestore/task-completions.ts), never by admin-reviewed proof.
export type TaskDoc = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  // Eligibility gate, mutually exclusive with minPackagePrice: the user's
  // active package must be exactly this one. Null means no exact-package
  // restriction (see minPackagePrice / the baseline "must currently hold an
  // active package" check applied everywhere task eligibility is decided —
  // packages never expire, so there is no separate "unexpired" condition).
  requiredPackageId: string | null;
  // Eligibility gate, mutually exclusive with requiredPackageId: the user's
  // active package's price must be at least this amount — a tier-style
  // "minimum package" rule using price as the platform's existing proxy for
  // package rank (packages have no separate explicit tier/level field).
  minPackagePrice: number | null;
  startDate: Timestamp;
  // Null means no end date (runs indefinitely until disabled/archived).
  endDate: Timestamp | null;
  // Any http(s) video URL (not restricted to a specific host) — opened in
  // a new tab when the user clicks the task's bottle; the video plays
  // entirely off-site (see task-rotation-list.tsx / external-task-watch.tsx),
  // never embedded on this site.
  videoUrl: string;
  status: TaskStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function tasksCollection(db: Firestore) {
  return typedCollection<TaskDoc>(db, TASKS_PATH);
}

export function taskDocRef(db: Firestore, taskId: string) {
  return doc(tasksCollection(db), taskId);
}

// Tasks realistically number in the tens/low hundreds, not thousands — a
// single unpaginated listener (mirroring packages) is simpler and correct
// at this scale, for both the admin management list and the user-facing
// browse list.
export function allTasksQuery(db: Firestore): Query<TaskDoc> {
  return query(tasksCollection(db), orderBy("createdAt", "desc"));
}

export type TaskInput = {
  title: string;
  description: string;
  instructions: string;
  requiredPackageId: string | null;
  minPackagePrice: number | null;
  startDate: Timestamp;
  endDate: Timestamp | null;
  videoUrl: string;
  status: TaskStatus;
};

export async function createTask(db: Firestore, input: TaskInput): Promise<string> {
  const ref = doc(tasksCollection(db));
  await setDoc(ref, {
    id: ref.id,
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(db: Firestore, taskId: string, input: TaskInput): Promise<void> {
  await updateDoc(taskDocRef(db, taskId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function setTaskStatus(
  db: Firestore,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await updateDoc(taskDocRef(db, taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
