import {
  createCmsGuideStep,
  updateCmsGuideStep,
  setCmsGuideStepPublished,
  deleteCmsGuideStep,
  cmsGuideStepDocRef,
  type CmsGuideStepDoc,
  type CmsGuideStepInput,
} from "@/lib/firestore/cms-guides";
import { swapOrder } from "@/lib/firestore/cms-shared";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsGuideStepAction(
  input: CmsGuideStepInput,
  reviewer: Reviewer,
): Promise<string> {
  const db = requireDb();
  const id = await createCmsGuideStep(db, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsGuideStep.created",
    targetType: "cmsGuideStep",
    targetId: id,
    details: `Created ${input.category} guide step "${input.title}"`,
  });
  return id;
}

export async function updateCmsGuideStepAction(
  id: string,
  input: CmsGuideStepInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateCmsGuideStep(db, id, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsGuideStep.updated",
    targetType: "cmsGuideStep",
    targetId: id,
    details: `Updated guide step "${input.title}"`,
  });
}

export async function setCmsGuideStepPublishedAction(
  id: string,
  title: string,
  isPublished: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setCmsGuideStepPublished(db, id, isPublished);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isPublished ? "cmsGuideStep.published" : "cmsGuideStep.unpublished",
    targetType: "cmsGuideStep",
    targetId: id,
    details: `${isPublished ? "Published" : "Unpublished"} guide step "${title}"`,
  });
}

export async function deleteCmsGuideStepAction(
  id: string,
  title: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await deleteCmsGuideStep(db, id);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsGuideStep.deleted",
    targetType: "cmsGuideStep",
    targetId: id,
    details: `Deleted guide step "${title}"`,
  });
}

export async function moveCmsGuideStepAction(
  current: CmsGuideStepDoc,
  neighbor: CmsGuideStepDoc,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await swapOrder(
    db,
    { ref: cmsGuideStepDocRef(db, current.id), order: current.order },
    { ref: cmsGuideStepDocRef(db, neighbor.id), order: neighbor.order },
  );
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsGuideStep.reordered",
    targetType: "cmsGuideStep",
    targetId: current.id,
    details: "Reordered guide steps",
  });
}
