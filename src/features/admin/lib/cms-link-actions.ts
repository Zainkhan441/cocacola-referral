import {
  createCmsLink,
  updateCmsLink,
  setCmsLinkPublished,
  deleteCmsLink,
  cmsLinkDocRef,
  type CmsLinkDoc,
  type CmsLinkInput,
} from "@/lib/firestore/cms-links";
import { swapOrder } from "@/lib/firestore/cms-shared";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsLinkAction(input: CmsLinkInput, reviewer: Reviewer): Promise<string> {
  const db = requireDb();
  const id = await createCmsLink(db, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsLink.created",
    targetType: "cmsLink",
    targetId: id,
    details: `Created ${input.placement} link "${input.label}"`,
  });
  return id;
}

export async function updateCmsLinkAction(
  id: string,
  input: CmsLinkInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateCmsLink(db, id, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsLink.updated",
    targetType: "cmsLink",
    targetId: id,
    details: `Updated link "${input.label}"`,
  });
}

export async function setCmsLinkPublishedAction(
  id: string,
  label: string,
  isPublished: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setCmsLinkPublished(db, id, isPublished);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isPublished ? "cmsLink.published" : "cmsLink.unpublished",
    targetType: "cmsLink",
    targetId: id,
    details: `${isPublished ? "Published" : "Unpublished"} link "${label}"`,
  });
}

export async function deleteCmsLinkAction(
  id: string,
  label: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await deleteCmsLink(db, id);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsLink.deleted",
    targetType: "cmsLink",
    targetId: id,
    details: `Deleted link "${label}"`,
  });
}

export async function moveCmsLinkAction(
  current: CmsLinkDoc,
  neighbor: CmsLinkDoc,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await swapOrder(
    db,
    { ref: cmsLinkDocRef(db, current.id), order: current.order },
    { ref: cmsLinkDocRef(db, neighbor.id), order: neighbor.order },
  );
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsLink.reordered",
    targetType: "cmsLink",
    targetId: current.id,
    details: "Reordered links",
  });
}
