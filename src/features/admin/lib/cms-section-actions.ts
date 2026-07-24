import {
  createCmsSection,
  updateCmsSection,
  setCmsSectionPublished,
  deleteCmsSection,
  swapSectionOrder,
  type CmsSectionInput,
  type CmsSectionDoc,
} from "@/lib/firestore/cms-sections";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsSectionAction(
  input: CmsSectionInput,
  reviewer: Reviewer,
): Promise<string> {
  const db = requireDb();
  const id = await createCmsSection(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsSection.created",
    targetType: "cmsSection",
    targetId: id,
    details: `Added a "${input.type}" section`,
  });

  return id;
}

export async function updateCmsSectionAction(
  id: string,
  input: CmsSectionInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateCmsSection(db, id, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsSection.updated",
    targetType: "cmsSection",
    targetId: id,
    details: `Updated a "${input.type}" section`,
  });
}

export async function setCmsSectionPublishedAction(
  id: string,
  isPublished: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setCmsSectionPublished(db, id, isPublished);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isPublished ? "cmsSection.published" : "cmsSection.unpublished",
    targetType: "cmsSection",
    targetId: id,
    details: `${isPublished ? "Published" : "Unpublished"} a section`,
  });
}

export async function deleteCmsSectionAction(id: string, reviewer: Reviewer): Promise<void> {
  const db = requireDb();
  await deleteCmsSection(db, id);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsSection.deleted",
    targetType: "cmsSection",
    targetId: id,
    details: "Deleted a section",
  });
}

export async function moveCmsSectionAction(
  current: CmsSectionDoc,
  neighbor: CmsSectionDoc,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await swapSectionOrder(db, current, neighbor);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsSection.reordered",
    targetType: "cmsSection",
    targetId: current.id,
    details: "Reordered a section",
  });
}
