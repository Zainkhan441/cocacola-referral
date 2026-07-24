import { runTransaction, serverTimestamp } from "firebase/firestore";
import { createTask, updateTask, setTaskStatus, type TaskInput, type TaskStatus } from "@/lib/firestore/tasks";
import { taskSubmissionDocRef } from "@/lib/firestore/task-submissions";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { newTransactionRef } from "@/lib/firestore/transactions";
import { newSystemNotificationRef, buildSystemNotificationData } from "@/lib/firestore/user-notifications";
import { logActivity } from "@/lib/firestore/activity-logs";
import { formatCurrency } from "@/lib/format";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createTaskAction(input: TaskInput, reviewer: Reviewer): Promise<string> {
  const db = requireDb();
  const taskId = await createTask(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "task.created",
    targetType: "task",
    targetId: taskId,
    details: `Created task "${input.title}"`,
  });

  return taskId;
}

export async function updateTaskAction(
  taskId: string,
  input: TaskInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateTask(db, taskId, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "task.updated",
    targetType: "task",
    targetId: taskId,
    details: `Updated task "${input.title}"`,
  });
}

export async function setTaskStatusAction(
  taskId: string,
  taskTitle: string,
  status: TaskStatus,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setTaskStatus(db, taskId, status);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: `task.${status}`,
    targetType: "task",
    targetId: taskId,
    details: `Set task "${taskTitle}" to ${status}`,
  });
}

// Approves a pending task submission: credits Current Balance (both
// users/{uid} and the mirrored wallets/{uid}) — the only wallet a task
// completion is ever allowed to touch — writes one completed ledger
// transaction, and marks the submission approved — all in one atomic
// transaction, same shape as approveDeposit. Re-reads the submission's own
// pending state at write time, so two concurrent approvals of the same
// request can't both succeed.
export async function approveTaskSubmission(
  submissionId: string,
  reviewer: Reviewer,
  note?: string | null,
): Promise<void> {
  const db = requireDb();
  const txnRef = newTransactionRef(db);
  const notificationRef = newSystemNotificationRef(db);

  let capturedAmount = 0;
  let capturedTitle = "";

  await runTransaction(db, async (transaction) => {
    const submissionSnap = await transaction.get(taskSubmissionDocRef(db, submissionId));
    if (!submissionSnap.exists()) {
      throw new Error("This task submission no longer exists.");
    }
    const submission = submissionSnap.data();
    if (submission.status !== "pending") {
      throw new Error("This task submission has already been reviewed.");
    }

    const userSnap = await transaction.get(userDocRef(db, submission.uid));
    if (!userSnap.exists()) {
      throw new Error("This user's profile could not be found.");
    }
    const user = userSnap.data();

    const newCurrentBalance = user.currentBalance + submission.rewardAmount;
    const newTotalEarnings = user.totalEarnings + submission.rewardAmount;

    transaction.update(userDocRef(db, submission.uid), {
      currentBalance: newCurrentBalance,
      totalEarnings: newTotalEarnings,
      updatedAt: serverTimestamp(),
    });
    transaction.update(walletDocRef(db, submission.uid), {
      currentBalance: newCurrentBalance,
      totalEarnings: newTotalEarnings,
      updatedAt: serverTimestamp(),
    });
    transaction.set(txnRef, {
      uid: submission.uid,
      userName: submission.userName,
      type: "task_reward",
      amount: submission.rewardAmount,
      status: "completed",
      description: `Task reward: ${submission.taskTitle}`,
      wallet: "currentBalance",
      referenceId: submissionId,
      createdAt: serverTimestamp(),
    });
    transaction.update(taskSubmissionDocRef(db, submissionId), {
      status: "approved",
      reviewedBy: reviewer.adminUid,
      reviewNote: note?.trim() || null,
      updatedAt: serverTimestamp(),
    });
    transaction.set(
      notificationRef,
      buildSystemNotificationData({
        uid: submission.uid,
        kind: "task_submission",
        title: "Task reward approved",
        body: `Your submission for "${submission.taskTitle}" was approved — ${formatCurrency(submission.rewardAmount)} was added to your Current Balance.`,
      }),
    );

    capturedAmount = submission.rewardAmount;
    capturedTitle = submission.taskTitle;
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "taskSubmission.approved",
    targetType: "taskSubmission",
    targetId: submissionId,
    details: `Approved a ${formatCurrency(capturedAmount)} reward for task "${capturedTitle}"` + (note?.trim() ? ` — note: ${note.trim()}` : ""),
  });
}

export async function rejectTaskSubmission(
  submissionId: string,
  reviewer: Reviewer,
  note?: string | null,
): Promise<void> {
  const db = requireDb();
  const notificationRef = newSystemNotificationRef(db);

  await runTransaction(db, async (transaction) => {
    const submissionSnap = await transaction.get(taskSubmissionDocRef(db, submissionId));
    if (!submissionSnap.exists()) {
      throw new Error("This task submission no longer exists.");
    }
    const submission = submissionSnap.data();
    if (submission.status !== "pending") {
      throw new Error("This task submission has already been reviewed.");
    }

    transaction.update(taskSubmissionDocRef(db, submissionId), {
      status: "rejected",
      reviewedBy: reviewer.adminUid,
      reviewNote: note?.trim() || null,
      updatedAt: serverTimestamp(),
    });

    transaction.set(
      notificationRef,
      buildSystemNotificationData({
        uid: submission.uid,
        kind: "task_submission",
        title: "Task submission rejected",
        body: note?.trim()
          ? `Your submission for "${submission.taskTitle}" was rejected: ${note.trim()}`
          : `Your submission for "${submission.taskTitle}" was rejected. Please contact support for details.`,
      }),
    );
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "taskSubmission.rejected",
    targetType: "taskSubmission",
    targetId: submissionId,
    details: "Rejected task submission" + (note?.trim() ? ` — note: ${note.trim()}` : ""),
  });
}
