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

const CMS_GUIDE_STEPS_PATH = "cmsGuideSteps";

export type CmsGuideCategory = "deposit" | "withdrawal" | "referral" | "package";

// Replaces the Milestone 13 hardcoded DEPOSIT_GUIDE/WITHDRAWAL_GUIDE/
// REFERRAL_GUIDE/PACKAGE_GUIDE arrays — feeds the Guide & Help Center.
export type CmsGuideStepDoc = {
  id: string;
  category: CmsGuideCategory;
  title: string;
  body: string;
  order: number;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function cmsGuideStepsCollection(db: Firestore) {
  return typedCollection<CmsGuideStepDoc>(db, CMS_GUIDE_STEPS_PATH);
}

export function cmsGuideStepDocRef(db: Firestore, id: string) {
  return doc(cmsGuideStepsCollection(db), id);
}

export function newCmsGuideStepRef(db: Firestore) {
  return doc(cmsGuideStepsCollection(db));
}

// Requires a composite index (category asc, order asc).
export function cmsGuideStepsForCategoryQuery(
  db: Firestore,
  category: CmsGuideCategory,
): Query<CmsGuideStepDoc> {
  return query(cmsGuideStepsCollection(db), where("category", "==", category), orderBy("order", "asc"));
}

// Requires a composite index (category asc, isPublished asc, order asc).
export async function getPublishedGuideSteps(
  db: Firestore,
  category: CmsGuideCategory,
): Promise<CmsGuideStepDoc[]> {
  const snapshot = await getDocs(
    query(
      cmsGuideStepsCollection(db),
      where("category", "==", category),
      where("isPublished", "==", true),
      orderBy("order", "asc"),
    ),
  );
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export type CmsGuideStepInput = {
  category: CmsGuideCategory;
  title: string;
  body: string;
  order: number;
  isPublished: boolean;
};

export async function createCmsGuideStep(db: Firestore, input: CmsGuideStepInput): Promise<string> {
  const ref = newCmsGuideStepRef(db);
  await setDoc(ref, { id: ref.id, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateCmsGuideStep(
  db: Firestore,
  id: string,
  input: CmsGuideStepInput,
): Promise<void> {
  await updateDoc(cmsGuideStepDocRef(db, id), { ...input, updatedAt: serverTimestamp() });
}

export async function setCmsGuideStepPublished(
  db: Firestore,
  id: string,
  isPublished: boolean,
): Promise<void> {
  await updateDoc(cmsGuideStepDocRef(db, id), { isPublished, updatedAt: serverTimestamp() });
}

export async function deleteCmsGuideStep(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsGuideStepDocRef(db, id));
}
