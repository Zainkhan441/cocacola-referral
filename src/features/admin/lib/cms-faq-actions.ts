import {
  createCmsFaqItem,
  updateCmsFaqItem,
  setCmsFaqItemPublished,
  deleteCmsFaqItem,
  cmsFaqDocRef,
  type CmsFaqItemDoc,
  type CmsFaqItemInput,
} from "@/lib/firestore/cms-faq";
import { swapOrder } from "@/lib/firestore/cms-shared";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsFaqItemAction(
  input: CmsFaqItemInput,
  reviewer: Reviewer,
): Promise<string> {
  const db = requireDb();
  const id = await createCmsFaqItem(db, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsFaq.created",
    targetType: "cmsFaq",
    targetId: id,
    details: `Created FAQ item "${input.question}"`,
  });
  return id;
}

export async function updateCmsFaqItemAction(
  id: string,
  input: CmsFaqItemInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateCmsFaqItem(db, id, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsFaq.updated",
    targetType: "cmsFaq",
    targetId: id,
    details: `Updated FAQ item "${input.question}"`,
  });
}

export async function setCmsFaqItemPublishedAction(
  id: string,
  question: string,
  isPublished: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setCmsFaqItemPublished(db, id, isPublished);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isPublished ? "cmsFaq.published" : "cmsFaq.unpublished",
    targetType: "cmsFaq",
    targetId: id,
    details: `${isPublished ? "Published" : "Unpublished"} FAQ item "${question}"`,
  });
}

export async function deleteCmsFaqItemAction(
  id: string,
  question: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await deleteCmsFaqItem(db, id);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsFaq.deleted",
    targetType: "cmsFaq",
    targetId: id,
    details: `Deleted FAQ item "${question}"`,
  });
}

export async function moveCmsFaqItemAction(
  current: CmsFaqItemDoc,
  neighbor: CmsFaqItemDoc,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await swapOrder(
    db,
    { ref: cmsFaqDocRef(db, current.id), order: current.order },
    { ref: cmsFaqDocRef(db, neighbor.id), order: neighbor.order },
  );
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsFaq.reordered",
    targetType: "cmsFaq",
    targetId: current.id,
    details: "Reordered FAQ items",
  });
}
