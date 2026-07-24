import {
  upsertReferralLevelSetting,
  type ReferralLevelSettingInput,
} from "@/lib/firestore/referral-settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function updateReferralLevelSettingAction(
  level: number,
  input: ReferralLevelSettingInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await upsertReferralLevelSetting(db, level, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "referral_settings.updated",
    targetType: "referralLevelSettings",
    targetId: String(level),
    details: `Set level ${level} reward to ${input.enabled ? "enabled" : "disabled"}, ${
      input.rewardType === "percentage" ? `${input.rewardValue}%` : `Rs ${input.rewardValue}`
    }`,
  });
}
