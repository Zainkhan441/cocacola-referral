import { doc, getDocs, query, where, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const BONUS_AWARDS_PATH = "bonusAwards";

// The actual "never pay the same one-time bonus twice" guarantee (Milestone
// 12 requirement 14): one document per (uid, tierId) pair, doc id
// `${uid}_${tierId}`, created ONLY by approveBonusClaim, ONLY for
// "one_time" tiers, inside the same atomic transaction that credits the
// wallet. Its mere existence means that tier has already been paid to that
// user — checked (via a direct transaction.get, which Firestore can do even
// though it can't run aggregate queries) before any money moves. Recurring
// tiers never write here, since they're allowed to pay out more than once.
export type BonusAwardDoc = {
  uid: string;
  tierId: string;
  claimId: string;
  amount: number;
  createdAt: Timestamp;
};

export function bonusAwardsCollection(db: Firestore) {
  return typedCollection<BonusAwardDoc>(db, BONUS_AWARDS_PATH);
}

export function bonusAwardDocRef(db: Firestore, uid: string, tierId: string) {
  return doc(bonusAwardsCollection(db), `${uid}_${tierId}`);
}

// Every one-time bonus a user has ever been paid — a single equality
// filter, no composite index needed. Used by the Bonuses page to know which
// one-time tiers are already claimed (and therefore should show "Already
// received" instead of a Claim button).
export async function getMyBonusAwardedTierIds(db: Firestore, uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(query(bonusAwardsCollection(db), where("uid", "==", uid)));
  return new Set(snapshot.docs.map((docSnap) => docSnap.data().tierId));
}
