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
import type { RewardType } from "@/lib/firestore/referral-settings";

const REFERRAL_REWARDS_PATH = "referralRewards";
const RECENT_REFERRAL_REWARDS_LIMIT = 5;
export const REFERRAL_REWARDS_PAGE_SIZE = 20;

export type ReferralRewardStatus = "pending" | "credited";

// Written only by the admin-run package-purchase approval transaction (see
// approveDeposit), one per (depositId, level) pair — the doc id is
// deterministic (`${depositId}_L${level}`, see referralRewardDocRef below) so
// a retried transaction attempt can never create two reward records for the
// same purchase and level.
export type ReferralRewardDoc = {
  earnerUid: string;
  // Denormalized at payout time so the admin reward-logs page can display
  // who earned/generated a reward without an extra read per row.
  earnerName: string;
  sourceUid: string;
  sourceName: string;
  level: number;
  amount: number;
  // The rate actually applied at payout time — kept here (not just looked up
  // from the live referralLevelSettings doc) so the reward ledger stays an
  // honest historical record even after an admin later edits that level's rate.
  rewardType: RewardType;
  rewardValue: number;
  packageId: string;
  packagePrice: number;
  depositId: string;
  status: ReferralRewardStatus;
  createdAt: Timestamp;
};

export function referralRewardsCollection(db: Firestore) {
  return typedCollection<ReferralRewardDoc>(db, REFERRAL_REWARDS_PATH);
}

export function referralRewardDocId(depositId: string, level: number): string {
  return `${depositId}_L${level}`;
}

export function referralRewardDocRef(db: Firestore, depositId: string, level: number) {
  return doc(referralRewardsCollection(db), referralRewardDocId(depositId, level));
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

export type RewardLevelFilter = number | "all";

// Requires a composite index (level asc, createdAt desc) for the level-filtered
// branch — see firestore.indexes.json. The unfiltered branch only needs the
// automatic single-field index on createdAt.
export function adminReferralRewardsPageQuery(
  db: Firestore,
  levelFilter: RewardLevelFilter,
  cursor: QueryDocumentSnapshot<ReferralRewardDoc> | null,
): Query<ReferralRewardDoc> {
  const base =
    levelFilter === "all"
      ? query(referralRewardsCollection(db), orderBy("createdAt", "desc"))
      : query(
          referralRewardsCollection(db),
          where("level", "==", levelFilter),
          orderBy("createdAt", "desc"),
        );
  return cursor
    ? query(base, startAfter(cursor), limit(REFERRAL_REWARDS_PAGE_SIZE))
    : query(base, limit(REFERRAL_REWARDS_PAGE_SIZE));
}
