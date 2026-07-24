import {
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";
import type { BonusRecurrence } from "@/lib/firestore/bonus-tiers";

const BONUS_CLAIMS_PATH = "bonusClaims";
export const BONUS_CLAIMS_PAGE_SIZE = 20;

export type BonusClaimStatus = "pending" | "approved" | "rejected";

// A user's self-service claim against a bonus tier they believe they
// qualify for. The directReferralsAtClaim/totalTeamAtClaim/activeTeamAtClaim
// fields are a snapshot of what the CLIENT reported at claim time — useful
// for admin review context, but never trusted as proof of eligibility
// (Firestore rules can't run aggregate queries to verify a claimed count is
// real). The actual authoritative check happens in approveBonusClaim, which
// re-fetches the claimant's live team aggregates before crediting anything —
// see features/admin/lib/bonus-actions.ts.
export type BonusClaimDoc = {
  tierId: string;
  tierName: string;
  bonusAmount: number;
  recurrence: BonusRecurrence;
  uid: string;
  userName: string;
  directReferralsAtClaim: number;
  totalTeamAtClaim: number;
  activeTeamAtClaim: number;
  packageIdAtClaim: string | null;
  status: BonusClaimStatus;
  reviewedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function bonusClaimsCollection(db: Firestore) {
  return typedCollection<BonusClaimDoc>(db, BONUS_CLAIMS_PATH);
}

export function bonusClaimDocRef(db: Firestore, claimId: string) {
  return doc(bonusClaimsCollection(db), claimId);
}

export function newBonusClaimRef(db: Firestore) {
  return doc(bonusClaimsCollection(db));
}

// --- A user's own claim history ---

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function myBonusClaimsPageQuery(
  db: Firestore,
  uid: string,
  cursor: QueryDocumentSnapshot<BonusClaimDoc> | null,
): Query<BonusClaimDoc> {
  return cursor
    ? query(
        bonusClaimsCollection(db),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(BONUS_CLAIMS_PAGE_SIZE),
      )
    : query(
        bonusClaimsCollection(db),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(BONUS_CLAIMS_PAGE_SIZE),
      );
}

// Used by the Bonuses page to disable "Claim" while a claim for that exact
// tier is still awaiting review. Requires its own composite index
// (uid asc, tierId asc, status asc) — see firestore.indexes.json.
export async function getMyPendingClaimForTier(
  db: Firestore,
  uid: string,
  tierId: string,
): Promise<boolean> {
  const snapshot = await getDocs(
    query(
      bonusClaimsCollection(db),
      where("uid", "==", uid),
      where("tierId", "==", tierId),
      where("status", "==", "pending"),
      limit(1),
    ),
  );
  return !snapshot.empty;
}

// --- Admin review queue ---

export type BonusClaimStatusFilter = BonusClaimStatus | "all";

// Requires a composite index (status asc, createdAt desc) for the filtered
// branch — see firestore.indexes.json. The unfiltered branch only needs the
// automatic single-field index on createdAt.
export function adminBonusClaimsPageQuery(
  db: Firestore,
  statusFilter: BonusClaimStatusFilter,
  cursor: QueryDocumentSnapshot<BonusClaimDoc> | null,
): Query<BonusClaimDoc> {
  const base =
    statusFilter === "all"
      ? query(bonusClaimsCollection(db), orderBy("createdAt", "desc"))
      : query(
          bonusClaimsCollection(db),
          where("status", "==", statusFilter),
          orderBy("createdAt", "desc"),
        );
  return cursor
    ? query(base, startAfter(cursor), limit(BONUS_CLAIMS_PAGE_SIZE))
    : query(base, limit(BONUS_CLAIMS_PAGE_SIZE));
}
