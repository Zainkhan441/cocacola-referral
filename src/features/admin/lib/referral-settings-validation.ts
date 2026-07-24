import type { RewardType } from "@/lib/firestore/referral-settings";

export function validateRewardValue(value: number, rewardType: RewardType): string | null {
  if (!Number.isFinite(value) || value < 0) {
    return "Enter a value of 0 or more.";
  }
  if (rewardType === "percentage" && value > 100) {
    return "Percentage cannot exceed 100.";
  }
  return null;
}
