import { setOfficialChannel, type OfficialChannelInput } from "@/lib/firestore/settings";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";
import { validateOptionalSafeUrl } from "@/features/admin/lib/cms-validation";

// Re-validated here (not just in the form component) so this action stays
// safe regardless of caller — the form already blocks this in the UI, but
// this is the actual write boundary, and every one of these fields renders
// as a real <a href>/<img src> on the public /channel page.
const URL_FIELDS: ReadonlyArray<{ key: keyof OfficialChannelInput; label: string }> = [
  { key: "telegramUrl", label: "Telegram URL" },
  { key: "whatsappUrl", label: "WhatsApp URL" },
  { key: "youtubeUrl", label: "YouTube URL" },
  { key: "websiteUrl", label: "Website URL" },
  { key: "bannerImageUrl", label: "Banner image URL" },
];

export async function updateOfficialChannelAction(
  input: OfficialChannelInput,
  reviewer: Reviewer,
): Promise<void> {
  for (const { key, label } of URL_FIELDS) {
    const error = validateOptionalSafeUrl(input[key] ?? "", label);
    if (error) throw new Error(error);
  }

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
