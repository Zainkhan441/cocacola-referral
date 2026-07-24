import { getDoc, writeBatch, Timestamp, type Firestore } from "firebase/firestore";
import { userDocRef, buildInitialUserData } from "@/lib/firestore/users";
import { walletDocRef, buildInitialWalletData } from "@/lib/firestore/wallets";
import { claimUniqueReferralCode } from "@/lib/firestore/referral-codes";
import { teamMemberDocRef, buildTeamMemberData, REFERRAL_LEVELS } from "@/lib/firestore/team-members";

type EnsureUserProfileInput = {
  uid: string;
  fullName: string;
  email: string;
  referredBy: string | null;
  // The direct referrer's own ancestor chain (their referredBy lineage, up to
  // 11 entries) — used to fan this new signup's team membership out to every
  // ancestor up to level 12. Empty when referredBy is null. See
  // referral-codes.ts's ReferralCodeDoc for where this comes from.
  referrerAncestorChain: string[];
  emailVerified: boolean;
};

// The single place that creates a user's Firestore profile — used both
// right after signup and by the missing-profile recovery flow. Idempotent
// and safe to call any number of times: it only ever creates documents
// that don't already exist yet (checked first, in the same call), and
// never touches a document that's already there, so it can never overwrite
// real profile or wallet data. users/{uid} and wallets/{uid} are written in
// one atomic batch, so a signup can never leave one without the other.
//
// If users/{uid} already exists (e.g. an earlier attempt got that far
// before failing), its existing referralCode/referredBy are reused rather
// than claiming a second code — but if users/{uid} is missing entirely,
// whatever referral attribution the original signup had is unrecoverable
// (it was only ever passed in as a transient form parameter, never
// persisted anywhere queryable) and the recovered profile is created with
// referredBy: null. This is a known, honest limitation of recovering from
// a fully-missing profile, not a bug.
export async function ensureUserProfile(
  db: Firestore,
  input: EnsureUserProfileInput,
): Promise<void> {
  const userRef = userDocRef(db, input.uid);
  const walletRef = walletDocRef(db, input.uid);

  const [userSnap, walletSnap] = await Promise.all([getDoc(userRef), getDoc(walletRef)]);

  if (userSnap.exists() && walletSnap.exists()) {
    return;
  }

  const referredBy = userSnap.exists() ? userSnap.data().referredBy : input.referredBy;

  // This new user's own full ancestor chain (level 1 = referredBy itself,
  // levels 2-12 = the referrer's own ancestors) — "Always fresh" from the
  // referrer's public code, never re-walked from private profiles the new
  // user isn't allowed to read yet. Empty when there's no referrer.
  const ancestorChain = referredBy
    ? [referredBy, ...input.referrerAncestorChain].slice(0, REFERRAL_LEVELS)
    : [];

  const referralCode = userSnap.exists()
    ? userSnap.data().referralCode
    : await claimUniqueReferralCode(db, input.uid, ancestorChain);

  const batch = writeBatch(db);

  if (!userSnap.exists()) {
    batch.set(
      userRef,
      buildInitialUserData({
        uid: input.uid,
        fullName: input.fullName,
        email: input.email,
        referralCode,
        referredBy,
        emailVerified: input.emailVerified,
      }),
    );

    const joinedAt = Timestamp.now();
    ancestorChain.forEach((ancestorUid, index) => {
      batch.set(
        teamMemberDocRef(db, ancestorUid, input.uid),
        buildTeamMemberData({
          ancestorUid,
          memberUid: input.uid,
          memberName: input.fullName,
          level: index + 1,
          joinedAt,
        }),
      );
    });
  }

  if (!walletSnap.exists()) {
    batch.set(walletRef, buildInitialWalletData(input.uid));
  }

  await batch.commit();
}
