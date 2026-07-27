import { setPaymentSettings, type PaymentSettingsInput } from "@/lib/firestore/settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function updatePaymentSettingsAction(
  input: PaymentSettingsInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setPaymentSettings(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "settings.payment_details_updated",
    targetType: "settings",
    targetId: "paymentDetails",
    details: "Updated central Easypaisa payment details",
  });
}
