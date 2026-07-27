import { setTaskRewardSettings, type TaskRewardSettingsInput } from "@/lib/firestore/settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function updateTaskRewardSettingsAction(
  input: TaskRewardSettingsInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setTaskRewardSettings(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "settings.task_reward_updated",
    targetType: "settings",
    targetId: "taskRewards",
    details: `Set task reward per ad to Rs ${input.rewardPerAd}`,
  });
}
