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

const CMS_FAQ_PATH = "cmsFaqItems";

// Replaces the Milestone 13 hardcoded FAQ_ITEMS — feeds both the public
// landing page's FAQ section and the Guide & Help Center's FAQ tab, so
// there's exactly one source of truth for FAQ content.
export type CmsFaqItemDoc = {
  id: string;
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function cmsFaqCollection(db: Firestore) {
  return typedCollection<CmsFaqItemDoc>(db, CMS_FAQ_PATH);
}

export function cmsFaqDocRef(db: Firestore, id: string) {
  return doc(cmsFaqCollection(db), id);
}

export function newCmsFaqRef(db: Firestore) {
  return doc(cmsFaqCollection(db));
}

export function allCmsFaqQuery(db: Firestore): Query<CmsFaqItemDoc> {
  return query(cmsFaqCollection(db), orderBy("order", "asc"));
}

export async function getPublishedFaqItems(db: Firestore): Promise<CmsFaqItemDoc[]> {
  const snapshot = await getDocs(
    query(cmsFaqCollection(db), where("isPublished", "==", true), orderBy("order", "asc")),
  );
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export type CmsFaqItemInput = {
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
};

export async function createCmsFaqItem(db: Firestore, input: CmsFaqItemInput): Promise<string> {
  const ref = newCmsFaqRef(db);
  await setDoc(ref, { id: ref.id, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateCmsFaqItem(
  db: Firestore,
  id: string,
  input: CmsFaqItemInput,
): Promise<void> {
  await updateDoc(cmsFaqDocRef(db, id), { ...input, updatedAt: serverTimestamp() });
}

export async function setCmsFaqItemPublished(
  db: Firestore,
  id: string,
  isPublished: boolean,
): Promise<void> {
  await updateDoc(cmsFaqDocRef(db, id), { isPublished, updatedAt: serverTimestamp() });
}

export async function deleteCmsFaqItem(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsFaqDocRef(db, id));
}
