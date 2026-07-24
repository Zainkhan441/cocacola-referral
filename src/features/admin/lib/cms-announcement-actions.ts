import {
  createCmsAnnouncement,
  updateCmsAnnouncement,
  setCmsAnnouncementPublished,
  deleteCmsAnnouncement,
  cmsAnnouncementDocRef,
  type CmsAnnouncementDoc,
  type CmsAnnouncementInput,
} from "@/lib/firestore/cms-announcements";
import { swapOrder } from "@/lib/firestore/cms-shared";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsAnnouncementAction(
  input: CmsAnnouncementInput,
  reviewer: Reviewer,
): Promise<string> {
  const db = requireDb();
  const id = await createCmsAnnouncement(db, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsAnnouncement.created",
    targetType: "cmsAnnouncement",
    targetId: id,
    details: `Created announcement "${input.title}"`,
  });
  return id;
}

export async function updateCmsAnnouncementAction(
  id: string,
  input: CmsAnnouncementInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateCmsAnnouncement(db, id, input);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsAnnouncement.updated",
    targetType: "cmsAnnouncement",
    targetId: id,
    details: `Updated announcement "${input.title}"`,
  });
}

export async function setCmsAnnouncementPublishedAction(
  id: string,
  title: string,
  isPublished: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setCmsAnnouncementPublished(db, id, isPublished);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isPublished ? "cmsAnnouncement.published" : "cmsAnnouncement.unpublished",
    targetType: "cmsAnnouncement",
    targetId: id,
    details: `${isPublished ? "Published" : "Unpublished"} announcement "${title}"`,
  });
}

export async function deleteCmsAnnouncementAction(
  id: string,
  title: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await deleteCmsAnnouncement(db, id);
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsAnnouncement.deleted",
    targetType: "cmsAnnouncement",
    targetId: id,
    details: `Deleted announcement "${title}"`,
  });
}

export async function moveCmsAnnouncementAction(
  current: CmsAnnouncementDoc,
  neighbor: CmsAnnouncementDoc,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await swapOrder(
    db,
    { ref: cmsAnnouncementDocRef(db, current.id), order: current.order },
    { ref: cmsAnnouncementDocRef(db, neighbor.id), order: neighbor.order },
  );
  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsAnnouncement.reordered",
    targetType: "cmsAnnouncement",
    targetId: current.id,
    details: "Reordered announcements",
  });
}
