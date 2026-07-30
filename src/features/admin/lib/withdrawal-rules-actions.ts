import { setWithdrawalRules, type WithdrawalRulesInput } from "@/lib/firestore/settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";
import { levelLabel, thresholdForLevel } from "@/lib/level";

export async function updateWithdrawalRulesAction(
  input: WithdrawalRulesInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setWithdrawalRules(db, input);

  const levelDescription =
    input.cocaColaRequiredLevel == null
      ? "disabled"
      : `${levelLabel(input.cocaColaRequiredLevel)} (${thresholdForLevel(input.cocaColaRequiredLevel)} active direct referrals)`;

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "settings.withdrawal_rules_updated",
    targetType: "settings",
    targetId: "withdrawalRules",
    details: `Set Current Balance minimum withdraw to Rs ${input.currentBalanceMinWithdraw} and Coca-Cola Earning required Level to ${levelDescription}`,
  });
}
