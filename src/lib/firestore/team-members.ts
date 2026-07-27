import {
  doc,
  getAggregateFromServer,
  count,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TEAM_MEMBERS_PATH = "teamMembers";
export const TEAM_MEMBERS_PAGE_SIZE = 20;
export const REFERRAL_LEVELS = 12;

// One document per (ancestor, member) pair — doc id is deterministic
// (`${ancestorUid}_${memberUid}`, see teamMemberDocRef) so a member can never
// end up with two entries under the same ancestor. This collection exists
// purely so an ancestor can see their own downline: Firestore security rules
// can't let a user query other users' profiles by `referredBy` transitively
// (only the immediate level would be provable in a rule), so each level's
// membership is denormalized here at signup time instead.
//
// Trust boundary: ancestorUid/level/joinedAt/memberName are self-reported by
// the member at signup (derived from the publicly-readable referralCodes
// chain, see referral-codes.ts) — a malicious client could in principle
// assert a bogus ancestor here, but that can never manufacture money: real
// referral rewards are computed independently by approveDeposit, which walks
// the authoritative (and, since this milestone, immutable-after-creation)
// users/{uid}.referredBy chain, never this collection. packageId/packageName/
// packageExpiresAt, by contrast, are written ONLY by that same trusted admin
// transaction, so they're always accurate for whatever the real package state
// was at the last purchase/renewal event.
export type TeamMemberDoc = {
  ancestorUid: string;
  memberUid: string;
  memberName: string;
  // Denormalized at signup alongside memberName (same trust boundary — see
  // the note above) so the Staff Earning referral list can show a masked
  // identifier without the ancestor ever needing read access to the
  // member's own users/{uid} document.
  memberEmail: string;
  level: number;
  joinedAt: Timestamp;
  packageId: string | null;
  packageName: string | null;
  // Status ("Active"/"Expired"/"No package") is deliberately NOT stored — it's
  // derived client-side by comparing this against Date.now(), same convention
  // as PackageStatusCard/WithdrawalForm, so it never needs a scheduled sweep
  // to stay fresh.
  packageExpiresAt: Timestamp | null;
  // The four fields below are written ONLY by the trusted admin
  // approveDeposit transaction (never self-reported like the fields above),
  // and only ever populated on the DIRECT referrer's (level 1) record —
  // commission is never paid past level 1, so these stay at their defaults
  // for every level-2+ record. packagePrice/packageApprovedAt record what was
  // actually approved for this specific member; commissionEarned is a
  // running total of every commission this ancestor has earned FROM this
  // one member (kept only for display — the authoritative ledger is the
  // referralRewards collection).
  packagePrice: number | null;
  packageApprovedAt: Timestamp | null;
  commissionEarned: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function teamMembersCollection(db: Firestore) {
  return typedCollection<TeamMemberDoc>(db, TEAM_MEMBERS_PATH);
}

export function teamMemberDocRef(db: Firestore, ancestorUid: string, memberUid: string) {
  return doc(teamMembersCollection(db), `${ancestorUid}_${memberUid}`);
}

type BuildTeamMemberInput = {
  ancestorUid: string;
  memberUid: string;
  memberName: string;
  memberEmail: string;
  level: number;
  joinedAt: Timestamp;
  packageId?: string | null;
  packageName?: string | null;
  packageExpiresAt?: Timestamp | null;
  packagePrice?: number | null;
  packageApprovedAt?: Timestamp | null;
  commissionEarned?: number;
};

// Exported so callers writing this alongside sibling documents in the same
// atomic batch/transaction (signup fan-out, admin backfill, package-purchase
// sync) can build the exact same shape without duplicating it.
export function buildTeamMemberData(input: BuildTeamMemberInput) {
  return {
    ancestorUid: input.ancestorUid,
    memberUid: input.memberUid,
    memberName: input.memberName,
    memberEmail: input.memberEmail,
    level: input.level,
    joinedAt: input.joinedAt,
    packageId: input.packageId ?? null,
    packageName: input.packageName ?? null,
    packageExpiresAt: input.packageExpiresAt ?? null,
    packagePrice: input.packagePrice ?? null,
    packageApprovedAt: input.packageApprovedAt ?? null,
    commissionEarned: input.commissionEarned ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

// --- An ancestor's own team view ---

export type TeamLevelFilter = number | "all";

// Requires composite indexes (ancestorUid asc, joinedAt desc) and
// (ancestorUid asc, level asc, joinedAt desc) — see firestore.indexes.json.
export function teamMembersPageQuery(
  db: Firestore,
  ancestorUid: string,
  levelFilter: TeamLevelFilter,
  cursor: QueryDocumentSnapshot<TeamMemberDoc> | null,
): Query<TeamMemberDoc> {
  const base =
    levelFilter === "all"
      ? query(
          teamMembersCollection(db),
          where("ancestorUid", "==", ancestorUid),
          orderBy("joinedAt", "desc"),
        )
      : query(
          teamMembersCollection(db),
          where("ancestorUid", "==", ancestorUid),
          where("level", "==", levelFilter),
          orderBy("joinedAt", "desc"),
        );
  return cursor
    ? query(base, startAfter(cursor), limit(TEAM_MEMBERS_PAGE_SIZE))
    : query(base, limit(TEAM_MEMBERS_PAGE_SIZE));
}

// Single equality filter — automatic single-field index, no composite needed.
export async function getTeamTotalCount(db: Firestore, ancestorUid: string): Promise<number> {
  const snapshot = await getAggregateFromServer(
    query(teamMembersCollection(db), where("ancestorUid", "==", ancestorUid)),
    { total: count() },
  );
  return snapshot.data().total;
}

// "Active" means this downline member currently holds a package (packages
// never expire — see PackageDoc — so there is no time dimension here
// anymore, just presence/absence of an assignment). Requires a composite
// index (ancestorUid asc, packageId asc).
export async function getTeamActiveCount(db: Firestore, ancestorUid: string): Promise<number> {
  const snapshot = await getAggregateFromServer(
    query(
      teamMembersCollection(db),
      where("ancestorUid", "==", ancestorUid),
      where("packageId", "!=", null),
    ),
    { total: count() },
  );
  return snapshot.data().total;
}

// Total DIRECT (level 1) referrals regardless of package status — the
// "Total direct referrals" figure for the Staff Earning section, distinct
// from getTeamTotalCount which sums every level 1-12. Requires the same
// (ancestorUid asc, level asc, joinedAt desc) composite index as
// teamMembersPageQuery's per-level branch.
export async function getDirectTotalReferralCount(
  db: Firestore,
  ancestorUid: string,
): Promise<number> {
  const snapshot = await getAggregateFromServer(
    query(
      teamMembersCollection(db),
      where("ancestorUid", "==", ancestorUid),
      where("level", "==", 1),
    ),
    { total: count() },
  );
  return snapshot.data().total;
}

// The "Level" that gates Coca-Cola Earning withdrawals (see
// settings/withdrawalRules): the count of the caller's own DIRECT (level 1)
// referrals who currently hold a package. Requires a composite index
// (ancestorUid asc, level asc, packageId asc).
export async function getDirectActiveReferralCount(
  db: Firestore,
  ancestorUid: string,
): Promise<number> {
  const snapshot = await getAggregateFromServer(
    query(
      teamMembersCollection(db),
      where("ancestorUid", "==", ancestorUid),
      where("level", "==", 1),
      where("packageId", "!=", null),
    ),
    { total: count() },
  );
  return snapshot.data().total;
}

// Requires the same (ancestorUid asc, level asc, joinedAt desc) composite
// index as teamMembersPageQuery's per-level branch (a count-only query is
// satisfied by any index whose filtered fields form a prefix).
export async function getTeamLevelCounts(
  db: Firestore,
  ancestorUid: string,
): Promise<Record<number, number>> {
  const levels = Array.from({ length: REFERRAL_LEVELS }, (_, index) => index + 1);
  const counts = await Promise.all(
    levels.map(async (level) => {
      const snapshot = await getAggregateFromServer(
        query(
          teamMembersCollection(db),
          where("ancestorUid", "==", ancestorUid),
          where("level", "==", level),
        ),
        { total: count() },
      );
      return [level, snapshot.data().total] as const;
    }),
  );
  return Object.fromEntries(counts);
}
