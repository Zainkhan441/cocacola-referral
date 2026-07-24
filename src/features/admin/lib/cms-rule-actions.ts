import {
  createCmsRule,
  updateCmsRule,
  setCmsRulePublished,
  deleteCmsRule,
  cmsRuleDocRef,
  type CmsRuleDoc,
  type CmsRuleInput,
} from "@/lib/firestore/cms-rules";
import { swapOrder } from "@/lib/firestore/cms-shared";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsRuleAction(input: CmsRuleInput, reviewer: Reviewer): Promise<string> {
  const db = requireDb();
  const id = await createCmsRule(db, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsRule.created",
    targetType: "cmsRule",
    targetId: id,
    details: "Created a platform rule",
  });
  return id;
}

export async function updateCmsRuleAction(
  id: string,
  input: CmsRuleInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateCmsRule(db, id, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsRule.updated",
    targetType: "cmsRule",
    targetId: id,
    details: "Updated a platform rule",
  });
}

export async function setCmsRulePublishedAction(
  id: string,
  isPublished: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setCmsRulePublished(db, id, isPublished);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isPublished ? "cmsRule.published" : "cmsRule.unpublished",
    targetType: "cmsRule",
    targetId: id,
    details: `${isPublished ? "Published" : "Unpublished"} a platform rule`,
  });
}

export async function deleteCmsRuleAction(id: string, reviewer: Reviewer): Promise<void> {
  const db = requireDb();
  await deleteCmsRule(db, id);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsRule.deleted",
    targetType: "cmsRule",
    targetId: id,
    details: "Deleted a platform rule",
  });
}

export async function moveCmsRuleAction(
  current: CmsRuleDoc,
  neighbor: CmsRuleDoc,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await swapOrder(
    db,
    { ref: cmsRuleDocRef(db, current.id), order: current.order },
    { ref: cmsRuleDocRef(db, neighbor.id), order: neighbor.order },
  );
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsRule.reordered",
    targetType: "cmsRule",
    targetId: current.id,
    details: "Reordered platform rules",
  });
}
