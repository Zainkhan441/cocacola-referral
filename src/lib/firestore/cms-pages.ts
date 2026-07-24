import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const CMS_PAGES_PATH = "cmsPages";

// Admin-authored custom informational pages (About Us, Contact Us, Privacy
// Policy, Terms, Promotions, News, Offers, or any custom page) — rendered
// publicly at /p/{slug}. Content lives entirely in cmsSections (see
// cms-sections.ts); this document is just the page's identity/metadata.
// Unpublished pages are only visible to admins (via firestore.rules), which
// is what makes "live preview" possible without a separate draft system.
export type CmsPageDoc = {
  id: string;
  slug: string;
  title: string;
  metaDescription: string | null;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function cmsPagesCollection(db: Firestore) {
  return typedCollection<CmsPageDoc>(db, CMS_PAGES_PATH);
}

export function cmsPageDocRef(db: Firestore, id: string) {
  return doc(cmsPagesCollection(db), id);
}

export function newCmsPageRef(db: Firestore) {
  return doc(cmsPagesCollection(db));
}

// Admin management list — every page regardless of published state.
export function allCmsPagesQuery(db: Firestore): Query<CmsPageDoc> {
  return query(cmsPagesCollection(db), orderBy("createdAt", "desc"));
}

// Public lookup by slug — requires isPublished == true explicitly in the
// query itself (not just relied on via rules), since Firestore rules can't
// partially filter a query result; a query that could return unpublished
// docs would be denied outright for a non-admin caller.
export async function getPublishedPageBySlug(
  db: Firestore,
  slug: string,
): Promise<CmsPageDoc | null> {
  const snapshot = await getDocs(
    query(
      cmsPagesCollection(db),
      where("slug", "==", slug),
      where("isPublished", "==", true),
      limit(1),
    ),
  );
  return snapshot.empty ? null : snapshot.docs[0].data();
}

// Admin preview: reads a page by slug regardless of published state — safe
// because the read rule allows isAdmin() to read anything here.
export async function getPageBySlugForAdmin(
  db: Firestore,
  slug: string,
): Promise<CmsPageDoc | null> {
  const snapshot = await getDocs(query(cmsPagesCollection(db), where("slug", "==", slug), limit(1)));
  return snapshot.empty ? null : snapshot.docs[0].data();
}

export type CmsPageInput = {
  slug: string;
  title: string;
  metaDescription: string | null;
  isPublished: boolean;
};

export async function createCmsPage(db: Firestore, input: CmsPageInput): Promise<string> {
  const ref = newCmsPageRef(db);
  await setDoc(ref, {
    id: ref.id,
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCmsPage(
  db: Firestore,
  id: string,
  input: CmsPageInput,
): Promise<void> {
  await updateDoc(cmsPageDocRef(db, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function setCmsPagePublished(
  db: Firestore,
  id: string,
  isPublished: boolean,
): Promise<void> {
  await updateDoc(cmsPageDocRef(db, id), {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

export async function getCmsPage(db: Firestore, id: string): Promise<CmsPageDoc | null> {
  const snapshot = await getDoc(cmsPageDocRef(db, id));
  return snapshot.exists() ? snapshot.data() : null;
}

// Deletes only the page document itself — callers that also need to remove
// its sections (see cms-sections.ts) must do so separately, since Firestore
// has no cascading delete.
export async function deleteCmsPage(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsPageDocRef(db, id));
}
