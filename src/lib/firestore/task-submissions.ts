import {
  doc,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";
import type { TaskFrequency } from "@/lib/firestore/tasks";

const TASK_SUBMISSIONS_PATH = "taskSubmissions";
export const TASK_SUBMISSIONS_PAGE_SIZE = 20;

export type TaskSubmissionStatus = "pending" | "approved" | "rejected";

// A "one_time" task's submission doc id is deterministic (`${taskId}_${uid}`,
// see oneTimeTaskSubmissionDocRef) — Firestore's own create-vs-update
// distinction (a `create` can only ever succeed once per doc path; every
// later attempt at that same path is evaluated as an `update`, which
// firestore.rules never allows a plain user to do here) is the actual
// duplicate-prevention mechanism, not application logic. A "daily" task's
// submission uses an auto-id instead (it's meant to repeat) and is gated by
// the sibling taskCooldowns/{uid}_{taskId} document's rolling 24h window.
export type TaskSubmissionDoc = {
  taskId: string;
  // Denormalized from the task at submission time — an honest record of
  // what was submitted against, even if the task is edited/archived later.
  taskTitle: string;
  rewardAmount: number;
  frequency: TaskFrequency;
  uid: string;
  userName: string;
  textResponse: string;
  proofScreenshotUrl: string | null;
  status: TaskSubmissionStatus;
  reviewedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function taskSubmissionsCollection(db: Firestore) {
  return typedCollection<TaskSubmissionDoc>(db, TASK_SUBMISSIONS_PATH);
}

export function taskSubmissionDocRef(db: Firestore, submissionId: string) {
  return doc(taskSubmissionsCollection(db), submissionId);
}

export function oneTimeTaskSubmissionDocRef(db: Firestore, taskId: string, uid: string) {
  return doc(taskSubmissionsCollection(db), `${taskId}_${uid}`);
}

export function newTaskSubmissionRef(db: Firestore) {
  return doc(taskSubmissionsCollection(db));
}

// --- A user's own submission history ---

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function myTaskSubmissionsPageQuery(
  db: Firestore,
  uid: string,
  cursor: QueryDocumentSnapshot<TaskSubmissionDoc> | null,
): Query<TaskSubmissionDoc> {
  return cursor
    ? query(
        taskSubmissionsCollection(db),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(TASK_SUBMISSIONS_PAGE_SIZE),
      )
    : query(
        taskSubmissionsCollection(db),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(TASK_SUBMISSIONS_PAGE_SIZE),
      );
}

// --- Admin review queue ---

export type TaskSubmissionStatusFilter = TaskSubmissionStatus | "all";

// Requires a composite index (status asc, createdAt desc) for the filtered
// branch — see firestore.indexes.json. The unfiltered branch only needs the
// automatic single-field index on createdAt.
export function adminTaskSubmissionsPageQuery(
  db: Firestore,
  statusFilter: TaskSubmissionStatusFilter,
  cursor: QueryDocumentSnapshot<TaskSubmissionDoc> | null,
): Query<TaskSubmissionDoc> {
  const base =
    statusFilter === "all"
      ? query(taskSubmissionsCollection(db), orderBy("createdAt", "desc"))
      : query(
          taskSubmissionsCollection(db),
          where("status", "==", statusFilter),
          orderBy("createdAt", "desc"),
        );
  return cursor
    ? query(base, startAfter(cursor), limit(TASK_SUBMISSIONS_PAGE_SIZE))
    : query(base, limit(TASK_SUBMISSIONS_PAGE_SIZE));
}
