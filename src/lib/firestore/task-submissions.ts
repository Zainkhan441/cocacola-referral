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

const TASK_SUBMISSIONS_PATH = "taskSubmissions";
export const TASK_SUBMISSIONS_PAGE_SIZE = 20;

export type TaskSubmissionStatus = "pending" | "approved" | "rejected";
// This legacy collection is frozen (see tasks.ts) — kept local since
// TaskDoc no longer has a frequency field at all.
export type TaskFrequency = "one_time" | "daily";

// Frozen, read/admin-review only — firestore.rules blocks every new create
// on this collection (see taskSubmissions/{id} there), and the collection
// is empty in production. This type and the queries below exist purely so
// the admin Task Submissions page can still render/review any
// pre-migration history without a code path that could ever add to it.
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
  // Optional admin-entered context for the review decision. Null until an
  // admin reviews the submission.
  reviewNote: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function taskSubmissionsCollection(db: Firestore) {
  return typedCollection<TaskSubmissionDoc>(db, TASK_SUBMISSIONS_PATH);
}

export function taskSubmissionDocRef(db: Firestore, submissionId: string) {
  return doc(taskSubmissionsCollection(db), submissionId);
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
