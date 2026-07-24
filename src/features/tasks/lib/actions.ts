import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { taskDocRef } from "@/lib/firestore/tasks";
import { userDocRef } from "@/lib/firestore/users";
import { packageDocRef } from "@/lib/firestore/packages";
import {
  oneTimeTaskSubmissionDocRef,
  newTaskSubmissionRef,
} from "@/lib/firestore/task-submissions";
import { taskCooldownDocRef } from "@/lib/firestore/task-cooldowns";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

type SubmitTaskCompletionInput = {
  uid: string;
  userName: string;
  taskId: string;
  textResponse: string;
  proofScreenshotUrl: string | null;
};

// Self-service: mirrors claimDailyEarning's shape — every value written is
// re-derived from the task's own current document inside the transaction
// (never trusted from a parameter), and firestore.rules independently
// re-validates the same eligibility/window checks, so a hand-crafted request
// bypassing this function can't submit early, twice, or for the wrong
// amount. One-time tasks are deduped via a deterministic submission doc id;
// daily tasks via the sibling taskCooldowns rolling-24h marker — see
// task-submissions.ts / task-cooldowns.ts for why.
export async function submitTaskCompletion(input: SubmitTaskCompletionInput): Promise<void> {
  const firestore = requireDb();

  await runTransaction(firestore, async (transaction) => {
    const taskSnap = await transaction.get(taskDocRef(firestore, input.taskId));
    if (!taskSnap.exists()) {
      throw new Error("This task no longer exists.");
    }
    const task = taskSnap.data();

    if (task.status !== "active") {
      throw new Error("This task is not currently available.");
    }
    const now = Date.now();
    if (now < task.startDate.toMillis()) {
      throw new Error("This task hasn't started yet.");
    }
    if (task.endDate && now > task.endDate.toMillis()) {
      throw new Error("This task has ended.");
    }

    const userSnap = await transaction.get(userDocRef(firestore, input.uid));
    if (!userSnap.exists()) {
      throw new Error("Your profile could not be found.");
    }
    const user = userSnap.data();

    if (!user.package || !user.packageExpiresAt || now >= user.packageExpiresAt.toMillis()) {
      throw new Error("You need an active package to complete tasks.");
    }
    const packageSnap = await transaction.get(packageDocRef(firestore, user.package));
    if (!packageSnap.exists() || !packageSnap.data().isActive) {
      throw new Error("Your package is not currently eligible for tasks.");
    }
    if (task.requiredPackageId && user.package !== task.requiredPackageId) {
      throw new Error("Your package doesn't qualify for this task.");
    }
    if (task.minPackagePrice != null && packageSnap.data().price < task.minPackagePrice) {
      throw new Error("Your package doesn't meet this task's minimum requirement.");
    }

    if (!input.textResponse.trim()) {
      throw new Error("Please describe how you completed this task.");
    }
    if (task.proofRequired && !input.proofScreenshotUrl) {
      throw new Error("This task requires a proof screenshot URL.");
    }

    // Resolve which submission ref to write to, and (for daily tasks) check
    // the cooldown — all reads, done before any write below.
    const submissionRef =
      task.frequency === "one_time"
        ? oneTimeTaskSubmissionDocRef(firestore, input.taskId, input.uid)
        : newTaskSubmissionRef(firestore);

    if (task.frequency === "one_time") {
      const existing = await transaction.get(submissionRef);
      if (existing.exists()) {
        throw new Error("You've already completed this task.");
      }
    }

    const cooldownRef =
      task.frequency === "daily" ? taskCooldownDocRef(firestore, input.uid, input.taskId) : null;
    if (cooldownRef) {
      const cooldownSnap = await transaction.get(cooldownRef);
      if (cooldownSnap.exists()) {
        const lastMs = cooldownSnap.data().lastSubmittedAt.toMillis();
        if (now < lastMs + COOLDOWN_MS) {
          throw new Error("You've already submitted this task recently. Please check back later.");
        }
      }
    }

    // --- Write phase ---
    transaction.set(submissionRef, {
      taskId: input.taskId,
      taskTitle: task.title,
      rewardAmount: task.rewardAmount,
      frequency: task.frequency,
      uid: input.uid,
      userName: input.userName,
      textResponse: input.textResponse.trim(),
      proofScreenshotUrl: input.proofScreenshotUrl,
      status: "pending",
      reviewedBy: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (cooldownRef) {
      transaction.set(cooldownRef, {
        uid: input.uid,
        taskId: input.taskId,
        lastSubmittedAt: serverTimestamp(),
      });
    }
  });
}
