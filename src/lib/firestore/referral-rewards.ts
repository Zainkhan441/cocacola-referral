import {
  doc,
  getAggregateFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  sum,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const REFERRAL_REWARDS_PATH = "referralRewards";
const RECENT_REFERRAL_REWARDS_LIMIT = 5;
export const REFERRAL_REWARDS_PAGE_SIZE = 20;

export type ReferralRewardStatus = "pending" | "credited";

// Written only by the admin-run package-purchase approval transaction (see
// approveDeposit) — one flat commission per deposit, paid to the
// purchaser's DIRECT referrer only (not a multi-level payout). The doc id is
// the depositId itself (see referralRewardDocRef below), so a retried
// transaction attempt can never create two reward records for the same
// purchase.
export type ReferralRewardDoc = {
  earnerUid: string;
  // Denormalized at payout time so the admin reward-logs page can display
  // who earned/generated a reward without an extra read per row.
  earnerName: string;
  sourceUid: string;
  sourceName: string;
  amount: number;
  packageId: string;
  packageName: string;
  packagePrice: number;
  depositId: string;
  status: ReferralRewardStatus;
  createdAt: Timestamp;
};

export function referralRewardsCollection(db: Firestore) {
  return typedCollection<ReferralRewardDoc>(db, REFERRAL_REWARDS_PATH);
}

export function referralRewardDocRef(db: Firestore, depositId: string) {
  return doc(referralRewardsCollection(db), depositId);
}

// Requires a composite index (earnerUid asc, createdAt desc) — see firestore.indexes.json.
export function recentReferralRewardsQuery(
  db: Firestore,
  uid: string,
): Query<ReferralRewardDoc> {
  return query(
    referralRewardsCollection(db),
    where("earnerUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_REFERRAL_REWARDS_LIMIT),
  );
}

// Server-side sum over the earner's full reward ledger, not just the recent
// page above — a single equality filter needs no composite index.
export async function getReferralEarningsTotal(
  db: Firestore,
  uid: string,
): Promise<number> {
  const rewardsQuery = query(
    referralRewardsCollection(db),
    where("earnerUid", "==", uid),
  );
  const snapshot = await getAggregateFromServer(rewardsQuery, {
    total: sum("amount"),
  });
  // Firestore's sum() resolves to `null`, not 0, when zero documents match
  // (e.g. a user with no referral rewards yet) — normalized to a real 0
  // here at the data layer, matching this function's declared return type.
  return snapshot.data().total ?? 0;
}

// --- Admin reward logs ---

// Requires a single-field index on createdAt (automatic).
export function adminReferralRewardsPageQuery(
  db: Firestore,
  cursor: QueryDocumentSnapshot<ReferralRewardDoc> | null,
): Query<ReferralRewardDoc> {
  const base = query(referralRewardsCollection(db), orderBy("createdAt", "desc"));
  return cursor
    ? query(base, startAfter(cursor), limit(REFERRAL_REWARDS_PAGE_SIZE))
    : query(base, limit(REFERRAL_REWARDS_PAGE_SIZE));
}
