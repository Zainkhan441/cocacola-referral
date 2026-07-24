import {
  doc,
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

const DAILY_REWARDS_PATH = "dailyRewards";
const RECENT_DAILY_REWARDS_LIMIT = 10;
export const DAILY_REWARDS_PAGE_SIZE = 25;

export type DailyRewardStatus = "pending" | "claimed";

// A claim is instant and self-service (see claimDailyEarning) — the
// document IS the claim, always written with status "claimed" the moment
// it's created. "pending" is reserved for a possible future milestone
// (e.g. scheduled accrual before an explicit claim step).
export type DailyRewardDoc = {
  uid: string;
  packageId: string;
  amount: number;
  // "YYYY-MM-DD" (UTC), informational/display only — the actual one-claim
  // gate is the rolling 24h cooldown on users/{uid}.lastDailyClaimAt, not
  // this string (Firestore rules can't compute calendar dates).
  rewardDate: string;
  status: DailyRewardStatus;
  createdAt: Timestamp;
};

export function dailyRewardsCollection(db: Firestore) {
  return typedCollection<DailyRewardDoc>(db, DAILY_REWARDS_PATH);
}

export function newDailyRewardRef(db: Firestore) {
  return doc(dailyRewardsCollection(db));
}

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function recentDailyRewardsQuery(db: Firestore, uid: string): Query<DailyRewardDoc> {
  return query(
    dailyRewardsCollection(db),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_DAILY_REWARDS_LIMIT),
  );
}

// --- Admin earning logs ---

// Requires a single-field index on createdAt (automatic).
export function dailyRewardsPageQuery(
  db: Firestore,
  cursor: QueryDocumentSnapshot<DailyRewardDoc> | null,
): Query<DailyRewardDoc> {
  return cursor
    ? query(
        dailyRewardsCollection(db),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(DAILY_REWARDS_PAGE_SIZE),
      )
    : query(dailyRewardsCollection(db), orderBy("createdAt", "desc"), limit(DAILY_REWARDS_PAGE_SIZE));
}

export function todayDateStringUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
