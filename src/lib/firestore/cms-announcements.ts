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

const CMS_ANNOUNCEMENTS_PATH = "cmsAnnouncements";

// Site-wide public announcement banners (e.g. a promo strip on the
// homepage) — distinct from the personal per-user notification inbox
// (Milestone 13's announcements/userNotifications), which is about
// individually-delivered, read-tracked messages, not public page content.
export type CmsAnnouncementDoc = {
  id: string;
  title: string;
  message: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  order: number;
  isPublished: boolean;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function cmsAnnouncementsCollection(db: Firestore) {
  return typedCollection<CmsAnnouncementDoc>(db, CMS_ANNOUNCEMENTS_PATH);
}

export function cmsAnnouncementDocRef(db: Firestore, id: string) {
  return doc(cmsAnnouncementsCollection(db), id);
}

export function newCmsAnnouncementRef(db: Firestore) {
  return doc(cmsAnnouncementsCollection(db));
}

export function allCmsAnnouncementsQuery(db: Firestore): Query<CmsAnnouncementDoc> {
  return query(cmsAnnouncementsCollection(db), orderBy("order", "asc"));
}

// Published announcements — the start/end date window is still evaluated
// client-side after fetch (see the note in cms-sections.ts on why).
export async function getPublishedAnnouncements(db: Firestore): Promise<CmsAnnouncementDoc[]> {
  const snapshot = await getDocs(
    query(cmsAnnouncementsCollection(db), where("isPublished", "==", true), orderBy("order", "asc")),
  );
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export type CmsAnnouncementInput = {
  title: string;
  message: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  order: number;
  isPublished: boolean;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
};

export async function createCmsAnnouncement(
  db: Firestore,
  input: CmsAnnouncementInput,
): Promise<string> {
  const ref = newCmsAnnouncementRef(db);
  await setDoc(ref, { id: ref.id, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateCmsAnnouncement(
  db: Firestore,
  id: string,
  input: CmsAnnouncementInput,
): Promise<void> {
  await updateDoc(cmsAnnouncementDocRef(db, id), { ...input, updatedAt: serverTimestamp() });
}

export async function setCmsAnnouncementPublished(
  db: Firestore,
  id: string,
  isPublished: boolean,
): Promise<void> {
  await updateDoc(cmsAnnouncementDocRef(db, id), { isPublished, updatedAt: serverTimestamp() });
}

export async function deleteCmsAnnouncement(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsAnnouncementDocRef(db, id));
}
