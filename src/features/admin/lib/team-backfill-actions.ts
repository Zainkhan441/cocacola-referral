import {
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { usersPageQuery, userDocRef, USERS_PAGE_SIZE, type UserDoc } from "@/lib/firestore/users";
import { packageDocRef } from "@/lib/firestore/packages";
import { teamMemberDocRef, REFERRAL_LEVELS } from "@/lib/firestore/team-members";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export type BackfillResult = {
  usersScanned: number;
  recordsCreated: number;
};

// One-time, idempotent repair for referral relationships that existed
// before Milestone 11 shipped: those users signed up before the
// signup-time teamMembers fan-out existed, so their ancestors' Team pages
// are missing them. Walks every user's real (and, since this milestone,
// immutable) referredBy chain up to 12 levels and creates whatever
// teamMembers records are missing — never overwrites one that already
// exists, so it's safe to run more than once or alongside normal traffic.
// Requires admin privileges: unlike a member's own self-fan-out at signup,
// this needs to read arbitrary other users' profiles to walk their chains.
export async function backfillTeamMembersAction(reviewer: Reviewer): Promise<BackfillResult> {
  const db = requireDb();

  const userCache = new Map<string, UserDoc | null>();
  const packageNameCache = new Map<string, string | null>();

  async function getCachedUser(uid: string): Promise<UserDoc | null> {
    if (userCache.has(uid)) return userCache.get(uid) ?? null;
    const snap = await getDoc(userDocRef(db, uid));
    const data = snap.exists() ? snap.data() : null;
    userCache.set(uid, data);
    return data;
  }

  async function getCachedPackageName(packageId: string): Promise<string | null> {
    if (packageNameCache.has(packageId)) return packageNameCache.get(packageId) ?? null;
    const snap = await getDoc(packageDocRef(db, packageId));
    const name = snap.exists() ? snap.data().name : null;
    packageNameCache.set(packageId, name);
    return name;
  }

  let usersScanned = 0;
  let recordsCreated = 0;
  let cursor: QueryDocumentSnapshot<UserDoc> | null = null;

  for (;;) {
    const pageQuery = usersPageQuery(db, cursor);
    const snapshot = await getDocs(pageQuery);
    if (snapshot.empty) break;

    for (const memberSnap of snapshot.docs) {
      usersScanned++;
      const member = memberSnap.data();
      userCache.set(member.uid, member);
      if (!member.referredBy) continue;

      const chain: string[] = [];
      let currentUid: string | null = member.referredBy;
      while (currentUid && chain.length < REFERRAL_LEVELS) {
        chain.push(currentUid);
        const ancestor = await getCachedUser(currentUid);
        currentUid = ancestor?.referredBy ?? null;
      }

      const packageName = member.package ? await getCachedPackageName(member.package) : null;

      for (let index = 0; index < chain.length; index++) {
        const ancestorUid = chain[index];
        const ref = teamMemberDocRef(db, ancestorUid, member.uid);
        const existing = await getDoc(ref);
        if (existing.exists()) continue;

        await setDoc(ref, {
          ancestorUid,
          memberUid: member.uid,
          memberName: member.fullName,
          level: index + 1,
          joinedAt: member.createdAt,
          packageId: member.package,
          packageName,
          packageExpiresAt: member.packageExpiresAt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        recordsCreated++;
      }
    }

    cursor = snapshot.docs.at(-1) ?? null;
    if (snapshot.docs.length < USERS_PAGE_SIZE) break;
  }

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "referrals.backfill_team_members",
    targetType: "system",
    targetId: "teamMembers",
    details: `Scanned ${usersScanned} user(s), created ${recordsCreated} missing team record(s)`,
  });

  return { usersScanned, recordsCreated };
}
