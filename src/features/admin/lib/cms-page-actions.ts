import {
  createCmsPage,
  updateCmsPage,
  setCmsPagePublished,
  deleteCmsPage,
  type CmsPageInput,
} from "@/lib/firestore/cms-pages";
import { deleteAllSectionsForPage } from "@/lib/firestore/cms-sections";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createCmsPageAction(input: CmsPageInput, reviewer: Reviewer): Promise<string> {
  const db = requireDb();
  const id = await createCmsPage(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsPage.created",
    targetType: "cmsPage",
    targetId: id,
    details: `Created page "${input.title}" (/p/${input.slug})`,
  });

  return id;
}

export async function updateCmsPageAction(
  id: string,
  input: CmsPageInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateCmsPage(db, id, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsPage.updated",
    targetType: "cmsPage",
    targetId: id,
    details: `Updated page "${input.title}"`,
  });
}

export async function setCmsPagePublishedAction(
  id: string,
  title: string,
  isPublished: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setCmsPagePublished(db, id, isPublished);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isPublished ? "cmsPage.published" : "cmsPage.unpublished",
    targetType: "cmsPage",
    targetId: id,
    details: `${isPublished ? "Published" : "Unpublished"} page "${title}"`,
  });
}

export async function deleteCmsPageAction(
  id: string,
  title: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await deleteAllSectionsForPage(db, id);
  await deleteCmsPage(db, id);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "cmsPage.deleted",
    targetType: "cmsPage",
    targetId: id,
    details: `Deleted page "${title}" and all its sections`,
  });
}
