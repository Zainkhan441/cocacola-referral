import {
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const BONUS_TIERS_PATH = "bonusTiers";

export type BonusRecurrence = "one_time" | "recurring";

// Admin-managed salary/level bonus tier definitions. Every requirement field
// is configurable — no numeric value here is ever hardcoded into the
// eligibility/payout engine (see features/bonuses and approveBonusClaim),
// and no tier is seeded by default (Milestone 12: "do not invent tier
// values"). Any signed-in user may read them (needed to show progress
// toward not-yet-met tiers); only an admin may write.
export type BonusTierDoc = {
  id: string;
  name: string;
  requiredDirectReferrals: number;
  requiredTotalTeam: number;
  requiredActiveTeam: number;
  // Exact match required, or null for no package restriction. Distinct from
  // tasks.ts's dual exact-or-minimum rule — Milestone 12 asked for a single
  // "required package" per tier, not a minimum-price variant.
  requiredPackageId: string | null;
  bonusAmount: number;
  recurrence: BonusRecurrence;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function bonusTiersCollection(db: Firestore) {
  return typedCollection<BonusTierDoc>(db, BONUS_TIERS_PATH);
}

export function bonusTierDocRef(db: Firestore, tierId: string) {
  return doc(bonusTiersCollection(db), tierId);
}

// Bonus tiers realistically number in the tens, not thousands — a single
// unpaginated listener (mirroring packages/tasks) is simpler and correct.
export function allBonusTiersQuery(db: Firestore): Query<BonusTierDoc> {
  return query(bonusTiersCollection(db), orderBy("createdAt", "desc"));
}

export type BonusTierInput = {
  name: string;
  requiredDirectReferrals: number;
  requiredTotalTeam: number;
  requiredActiveTeam: number;
  requiredPackageId: string | null;
  bonusAmount: number;
  recurrence: BonusRecurrence;
  isActive: boolean;
};

export async function createBonusTier(db: Firestore, input: BonusTierInput): Promise<string> {
  const ref = doc(bonusTiersCollection(db));
  await setDoc(ref, {
    id: ref.id,
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBonusTier(
  db: Firestore,
  tierId: string,
  input: BonusTierInput,
): Promise<void> {
  await updateDoc(bonusTierDocRef(db, tierId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function setBonusTierActive(
  db: Firestore,
  tierId: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(bonusTierDocRef(db, tierId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}
