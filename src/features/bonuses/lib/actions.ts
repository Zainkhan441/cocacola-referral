import { getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { bonusTierDocRef } from "@/lib/firestore/bonus-tiers";
import { userDocRef } from "@/lib/firestore/users";
import { bonusAwardDocRef } from "@/lib/firestore/bonus-awards";
import { newBonusClaimRef, pendingBonusClaimDocRef } from "@/lib/firestore/bonus-claims";
import {
  getTeamTotalCount,
  getTeamActiveCount,
  getDirectActiveReferralCount,
} from "@/lib/firestore/team-members";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

type SubmitBonusClaimInput = {
  uid: string;
  userName: string;
  tierId: string;
};

// Self-service claim submission. The eligibility numbers baked into this
// claim are a snapshot for the admin's review context, computed from the
// SAME live aggregate queries the Bonuses page itself uses (Team page
// counts) — never trusted as proof by the payout engine. The actual
// authoritative check (and the real "never pay twice" guarantee) happens in
// approveBonusClaim, which re-fetches these same aggregates fresh at
// approval time before crediting anything — see
// features/admin/lib/bonus-actions.ts. This function's own pre-checks exist
// only to give the user a clear, immediate error instead of a raw
// permission-denied when they don't yet qualify.
export async function submitBonusClaim(input: SubmitBonusClaimInput): Promise<void> {
  const firestore = requireDb();

  const tierSnap = await getDoc(bonusTierDocRef(firestore, input.tierId));
  if (!tierSnap.exists() || !tierSnap.data().isActive) {
    throw new Error("This bonus tier is no longer available.");
  }
  const tier = tierSnap.data();

  const userSnap = await getDoc(userDocRef(firestore, input.uid));
  if (!userSnap.exists()) {
    throw new Error("Your profile could not be found.");
  }
  const user = userSnap.data();

  if (tier.requiredPackageId && user.package !== tier.requiredPackageId) {
    throw new Error("Your current package doesn't qualify for this bonus.");
  }

  if (tier.recurrence === "one_time") {
    const award = await getDoc(bonusAwardDocRef(firestore, input.uid, input.tierId));
    if (award.exists()) {
      throw new Error("You've already received this one-time bonus.");
    }
  }

  const [totalTeam, activeTeam, directReferrals] = await Promise.all([
    getTeamTotalCount(firestore, input.uid),
    getTeamActiveCount(firestore, input.uid),
    // Direct (level 1) referrals who currently hold a package — not every
    // level-1 registration — so a claim can't be satisfied by referrals who
    // signed up but never activated a package.
    getDirectActiveReferralCount(firestore, input.uid),
  ]);

  if (directReferrals < tier.requiredDirectReferrals) {
    throw new Error(`This bonus requires at least ${tier.requiredDirectReferrals} direct referral(s).`);
  }
  if (totalTeam < tier.requiredTotalTeam) {
    throw new Error(`This bonus requires a total team of at least ${tier.requiredTotalTeam}.`);
  }
  if (activeTeam < tier.requiredActiveTeam) {
    throw new Error(`This bonus requires an active team of at least ${tier.requiredActiveTeam}.`);
  }

  // Atomically checked-and-created, the same "read the lock, throw if it's
  // already there, otherwise create both docs together" pattern already
  // proven for withdrawals (see submitWithdrawalRequest) — the sole
  // mechanism (both here and in firestore.rules' pendingBonusClaims block)
  // preventing two pending claims for the same tier from ever coexisting,
  // even under concurrent submission. Everything above this point (tier
  // active, one-time-award, package/team-threshold checks) is still just an
  // advisory pre-check for a clear error message, same as before.
  const claimRef = newBonusClaimRef(firestore);
  const pendingRef = pendingBonusClaimDocRef(firestore, input.uid, input.tierId);

  await runTransaction(firestore, async (transaction) => {
    const pendingSnap = await transaction.get(pendingRef);
    if (pendingSnap.exists()) {
      throw new Error("You already have a claim for this bonus awaiting review.");
    }

    transaction.set(pendingRef, {
      uid: input.uid,
      tierId: input.tierId,
      claimId: claimRef.id,
      createdAt: serverTimestamp(),
    });
    transaction.set(claimRef, {
      tierId: input.tierId,
      tierName: tier.name,
      bonusAmount: tier.bonusAmount,
      recurrence: tier.recurrence,
      uid: input.uid,
      userName: input.userName,
      directReferralsAtClaim: directReferrals,
      totalTeamAtClaim: totalTeam,
      activeTeamAtClaim: activeTeam,
      packageIdAtClaim: user.package,
      status: "pending",
      reviewedBy: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}
