import { setWithdrawalRules, type WithdrawalRulesInput } from "@/lib/firestore/settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function updateWithdrawalRulesAction(
  input: WithdrawalRulesInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setWithdrawalRules(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "settings.withdrawal_rules_updated",
    targetType: "settings",
    targetId: "withdrawalRules",
    details: `Set Current Balance minimum withdraw to Rs ${input.currentBalanceMinWithdraw} and Coca-Cola Earning required Level to ${input.cocaColaRequiredLevel}`,
  });
}
