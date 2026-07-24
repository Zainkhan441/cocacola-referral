import {
  doc,
  getAggregateFromServer,
  count,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
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
  level: number;
  joinedAt: Timestamp;
  packageId: string | null;
  packageName: string | null;
  // Status ("Active"/"Expired"/"No package") is deliberately NOT stored — it's
  // derived client-side by comparing this against Date.now(), same convention
  // as PackageStatusCard/WithdrawalForm, so it never needs a scheduled sweep
  // to stay fresh.
  packageExpiresAt: Timestamp | null;
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
  level: number;
  joinedAt: Timestamp;
  packageId?: string | null;
  packageName?: string | null;
  packageExpiresAt?: Timestamp | null;
};

// Exported so callers writing this alongside sibling documents in the same
// atomic batch/transaction (signup fan-out, admin backfill, package-purchase
// sync) can build the exact same shape without duplicating it.
export function buildTeamMemberData(input: BuildTeamMemberInput) {
  return {
    ancestorUid: input.ancestorUid,
    memberUid: input.memberUid,
    memberName: input.memberName,
    level: input.level,
    joinedAt: input.joinedAt,
    packageId: input.packageId ?? null,
    packageName: input.packageName ?? null,
    packageExpiresAt: input.packageExpiresAt ?? null,
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

// Requires a composite index (ancestorUid asc, packageExpiresAt asc).
export async function getTeamActiveCount(db: Firestore, ancestorUid: string): Promise<number> {
  const snapshot = await getAggregateFromServer(
    query(
      teamMembersCollection(db),
      where("ancestorUid", "==", ancestorUid),
      where("packageExpiresAt", ">", Timestamp.now()),
    ),
    { total: count() },
  );
  return snapshot.data().total;
}

// The "Level" that gates Coca-Cola Earning withdrawals (see
// settings/withdrawalRules): the count of the caller's own DIRECT (level 1)
// referrals who currently have an active, unexpired package. Requires a
// composite index (ancestorUid asc, level asc, packageExpiresAt asc).
export async function getDirectActiveReferralCount(
  db: Firestore,
  ancestorUid: string,
): Promise<number> {
  const snapshot = await getAggregateFromServer(
    query(
      teamMembersCollection(db),
      where("ancestorUid", "==", ancestorUid),
      where("level", "==", 1),
      where("packageExpiresAt", ">", Timestamp.now()),
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
