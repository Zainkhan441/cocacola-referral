import { createCmsMedia, deleteCmsMedia, type CmsMediaInput } from "@/lib/firestore/cms-media";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsMediaAction(input: CmsMediaInput, reviewer: Reviewer): Promise<string> {
  const db = requireDb();
  const id = await createCmsMedia(db, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsMedia.created",
    targetType: "cmsMedia",
    targetId: id,
    details: `Added ${input.type} "${input.label}" to the media library`,
  });
  return id;
}

export async function deleteCmsMediaAction(
  id: string,
  label: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await deleteCmsMedia(db, id);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsMedia.deleted",
    targetType: "cmsMedia",
    targetId: id,
    details: `Removed "${label}" from the media library`,
  });
}
