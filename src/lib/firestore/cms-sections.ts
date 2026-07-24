import {
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const CMS_SECTIONS_PATH = "cmsSections";

// The 11 reusable section types this CMS supports — deliberately closed:
// custom/raw HTML is never one of them, so there is no way to inject
// arbitrary markup or scripts through this system. Every type is rendered
// by a fixed, hand-written component (see SectionRenderer) using only the
// plain-text/URL fields below.
export type CmsSectionType =
  | "hero"
  | "rich_text"
  | "image_text"
  | "cards_grid"
  | "faq"
  | "contact_block"
  | "cta"
  | "banner"
  | "video"
  | "document"
  | "social_links";

// A single repeatable entry, used by the list-shaped section types
// (cards_grid, faq, social_links). Unused (empty array) for single-content
// types like hero/rich_text/cta.
export type CmsSectionItem = {
  title: string;
  subtitle: string | null;
  description: string | null;
  mediaUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
};

// One unified schema for every section type, covering exactly the field set
// Milestone 16 asked for (title/subtitle/description/richText/mediaUrl/
// buttonLabel/buttonUrl/order/isPublished/startDate/endDate) — rather than
// eleven bespoke shapes. Which fields a given type actually uses is a
// rendering-layer concern (SectionRenderer), not a schema concern.
export type CmsSectionDoc = {
  id: string;
  pageId: string;
  type: CmsSectionType;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  // Plain text only, line breaks preserved on render — never parsed as
  // HTML or markdown, so there is no injection surface here either.
  richText: string | null;
  mediaUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  items: CmsSectionItem[];
  order: number;
  isPublished: boolean;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function cmsSectionsCollection(db: Firestore) {
  return typedCollection<CmsSectionDoc>(db, CMS_SECTIONS_PATH);
}

export function cmsSectionDocRef(db: Firestore, id: string) {
  return doc(cmsSectionsCollection(db), id);
}

export function newCmsSectionRef(db: Firestore) {
  return doc(cmsSectionsCollection(db));
}

// Admin management view — every section of a page regardless of published
// state. Requires a composite index (pageId asc, order asc).
export function cmsSectionsForPageQuery(db: Firestore, pageId: string): Query<CmsSectionDoc> {
  return query(cmsSectionsCollection(db), where("pageId", "==", pageId), orderBy("order", "asc"));
}

// Public rendering view — published sections only. Same composite index
// serves this as a prefix-compatible query (pageId asc, order asc), plus
// the isPublished filter is applied client-side after fetch since a section
// list is small per page and its date-window (start/end) visibility also
// has to be evaluated client-side regardless (Firestore can't express "now
// is between two different fields" in one query).
export async function getPublishedSectionsForPage(
  db: Firestore,
  pageId: string,
): Promise<CmsSectionDoc[]> {
  const snapshot = await getDocs(
    query(cmsSectionsCollection(db), where("pageId", "==", pageId), where("isPublished", "==", true), orderBy("order", "asc")),
  );
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export type CmsSectionInput = {
  pageId: string;
  type: CmsSectionType;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  richText: string | null;
  mediaUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  items: CmsSectionItem[];
  order: number;
  isPublished: boolean;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
};

export async function createCmsSection(db: Firestore, input: CmsSectionInput): Promise<string> {
  const ref = newCmsSectionRef(db);
  await setDoc(ref, {
    id: ref.id,
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCmsSection(
  db: Firestore,
  id: string,
  input: CmsSectionInput,
): Promise<void> {
  await updateDoc(cmsSectionDocRef(db, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function setCmsSectionPublished(
  db: Firestore,
  id: string,
  isPublished: boolean,
): Promise<void> {
  await updateDoc(cmsSectionDocRef(db, id), {
    isPublished,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCmsSection(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsSectionDocRef(db, id));
}

// Deletes every section belonging to a page — used when the page itself is
// deleted, since Firestore has no cascading delete.
export async function deleteAllSectionsForPage(db: Firestore, pageId: string): Promise<void> {
  const snapshot = await getDocs(query(cmsSectionsCollection(db), where("pageId", "==", pageId)));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
  }
  await batch.commit();
}

// Swaps the `order` value of two sections — the reorder primitive the admin
// UI's up/down controls use. Both writes happen together so the ordering
// stays consistent even if one write were to fail.
export async function swapSectionOrder(
  db: Firestore,
  a: { id: string; order: number },
  b: { id: string; order: number },
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(cmsSectionDocRef(db, a.id), { order: b.order, updatedAt: serverTimestamp() });
  batch.update(cmsSectionDocRef(db, b.id), { order: a.order, updatedAt: serverTimestamp() });
  await batch.commit();
}
