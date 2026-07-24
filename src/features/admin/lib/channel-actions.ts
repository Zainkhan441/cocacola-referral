import { setOfficialChannel, type OfficialChannelInput } from "@/lib/firestore/settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function updateOfficialChannelAction(
  input: OfficialChannelInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setOfficialChannel(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "settings.official_channel_updated",
    targetType: "settings",
    targetId: "officialChannel",
    details: "Updated Official Channel links/banner",
  });
}
