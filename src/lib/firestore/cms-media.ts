import {
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const CMS_MEDIA_PATH = "cmsMedia";

export type CmsMediaType = "image" | "video" | "document";

// A named reference library of external media URLs an admin has vetted for
// reuse across pages/sections/banners — not a file upload/storage system
// (no Firebase Storage integration exists in this project). Admin-only in
// both directions: it's a content-authoring convenience, never rendered
// directly to the public (sections store their own resolved mediaUrl).
export type CmsMediaDoc = {
  id: string;
  label: string;
  url: string;
  type: CmsMediaType;
  createdAt: Timestamp;
};

export function cmsMediaCollection(db: Firestore) {
  return typedCollection<CmsMediaDoc>(db, CMS_MEDIA_PATH);
}

export function cmsMediaDocRef(db: Firestore, id: string) {
  return doc(cmsMediaCollection(db), id);
}

export function newCmsMediaRef(db: Firestore) {
  return doc(cmsMediaCollection(db));
}

export function allCmsMediaQuery(db: Firestore): Query<CmsMediaDoc> {
  return query(cmsMediaCollection(db), orderBy("createdAt", "desc"));
}

export type CmsMediaInput = {
  label: string;
  url: string;
  type: CmsMediaType;
};

export async function createCmsMedia(db: Firestore, input: CmsMediaInput): Promise<string> {
  const ref = newCmsMediaRef(db);
  await setDoc(ref, { id: ref.id, ...input, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteCmsMedia(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsMediaDocRef(db, id));
}
