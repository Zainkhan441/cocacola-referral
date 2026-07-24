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

const CMS_RULES_PATH = "cmsRules";

// Replaces the Milestone 13 hardcoded PLATFORM_RULES array — feeds the
// Guide & Help Center's Rules tab.
export type CmsRuleDoc = {
  id: string;
  text: string;
  order: number;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function cmsRulesCollection(db: Firestore) {
  return typedCollection<CmsRuleDoc>(db, CMS_RULES_PATH);
}

export function cmsRuleDocRef(db: Firestore, id: string) {
  return doc(cmsRulesCollection(db), id);
}

export function newCmsRuleRef(db: Firestore) {
  return doc(cmsRulesCollection(db));
}

export function allCmsRulesQuery(db: Firestore): Query<CmsRuleDoc> {
  return query(cmsRulesCollection(db), orderBy("order", "asc"));
}

export async function getPublishedRules(db: Firestore): Promise<CmsRuleDoc[]> {
  const snapshot = await getDocs(
    query(cmsRulesCollection(db), where("isPublished", "==", true), orderBy("order", "asc")),
  );
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export type CmsRuleInput = {
  text: string;
  order: number;
  isPublished: boolean;
};

export async function createCmsRule(db: Firestore, input: CmsRuleInput): Promise<string> {
  const ref = newCmsRuleRef(db);
  await setDoc(ref, { id: ref.id, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateCmsRule(db: Firestore, id: string, input: CmsRuleInput): Promise<void> {
  await updateDoc(cmsRuleDocRef(db, id), { ...input, updatedAt: serverTimestamp() });
}

export async function setCmsRulePublished(
  db: Firestore,
  id: string,
  isPublished: boolean,
): Promise<void> {
  await updateDoc(cmsRuleDocRef(db, id), { isPublished, updatedAt: serverTimestamp() });
}

export async function deleteCmsRule(db: Firestore, id: string): Promise<void> {
  await deleteDoc(cmsRuleDocRef(db, id));
}
