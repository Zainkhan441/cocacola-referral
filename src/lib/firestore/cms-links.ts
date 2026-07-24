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
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const CMS_LINKS_PATH = "cmsLinks";

// Replaces the hardcoded NAV_LINKS (header) and the footer's LEGAL_LINKS/
// SUPPORT_LINKS/NAV_LINKS — one schema, one admin UI (tabbed by placement),
// covering the site's header navigation and footer content requirements.
export type CmsLinkPlacement = "header" | "footer_nav" | "footer_legal" | "footer_support";

export type CmsLinkDoc = {
  id: string;
  placement: CmsLinkPlacement;
  label: string;
  url: string;
  order: number;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function cmsLinksCollection(db: Firestore) {
  return typedCollection<CmsLinkDoc>(db, CMS_LINKS_PATH);
}

export function cmsLinkDocRef(db: Firestore, id: string) {
  return doc(cmsLinksCollection(db), id);
}

export function newCmsLinkRef(db: Firestore) {
  return doc(cmsLinksCollection(db));
}

// Requires a composite index (placement asc, order asc).
export function cmsLinksForPlacementQuery(
  db: Firestore,
  placement: CmsLinkPlacement,
): Query<CmsLinkDoc> {
  return query(cmsLinksCollection(db), where("placement", "==", placement), orderBy("order", "asc"));
}

// Requires a composite index (placement asc, isPublished asc, order asc).
export async function getPublishedLinksForPlacement(
  db: Firestore,
  placement: CmsLinkPlacement,
): Promise<CmsLinkDoc[]> {
  const snapshot = await getDocs(
    query(
      cmsLinksCollection(db),
      where("placement", "==", placement),
      where("isPublished", "==", true),
      orderBy("order", "asc"),
    ),
  );
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export type CmsLinkInput = {
  placement: CmsLinkPlacement;
  label: string;
  url: string;
  order: number;
  isPublished: boolean;
};

export async function createCmsLink(db: Firestore, input: CmsLinkInput): Promise<string> {
  const ref = newCmsLinkRef(db);
  await setDoc(ref, { id: ref.id, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateCmsLink(db: Firestore, id: string, input: CmsLinkInput): Promise<void> {
  await updateDoc(cmsLinkDocRef(db, id), { ...input, updatedAt: serverTimestamp() });
}

export async function setCmsLinkPublished(
  db: Firestore,
  id: string,
  isPublished: boolean,
): Promise<void> {
  await updateDoc(cmsLinkDocRef(db, id), { isPublished, updatedAt: serverTimestamp() });
}

export async function deleteCmsLink(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsLinkDocRef(db, id));
}
