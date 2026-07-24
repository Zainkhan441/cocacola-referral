import { setDailyClaimsEnabled } from "@/lib/firestore/settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function setDailyClaimsEnabledAction(
  enabled: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setDailyClaimsEnabled(db, enabled);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: enabled ? "settings.daily_claims_enabled" : "settings.daily_claims_disabled",
    targetType: "settings",
    targetId: "global",
    details: `${enabled ? "Enabled" : "Disabled"} daily claims platform-wide`,
  });
}
