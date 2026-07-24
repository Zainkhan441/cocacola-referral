import { getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import {
  createBonusTier,
  updateBonusTier,
  setBonusTierActive,
  bonusTierDocRef,
  type BonusTierInput,
} from "@/lib/firestore/bonus-tiers";
import { bonusClaimDocRef } from "@/lib/firestore/bonus-claims";
import { bonusAwardDocRef } from "@/lib/firestore/bonus-awards";
import { userDocRef } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { newTransactionRef } from "@/lib/firestore/transactions";
import {
  getTeamTotalCount,
  getTeamActiveCount,
  getTeamLevelCounts,
} from "@/lib/firestore/team-members";
import { logActivity } from "@/lib/firestore/activity-logs";
import { formatCurrency } from "@/lib/format";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createBonusTierAction(
  input: BonusTierInput,
  reviewer: Reviewer,
): Promise<string> {
  const db = requireDb();
  const tierId = await createBonusTier(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "bonusTier.created",
    targetType: "bonusTier",
    targetId: tierId,
    details: `Created bonus tier "${input.name}"`,
  });

  return tierId;
}

export async function updateBonusTierAction(
  tierId: string,
  input: BonusTierInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updateBonusTier(db, tierId, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "bonusTier.updated",
    targetType: "bonusTier",
    targetId: tierId,
    details: `Updated bonus tier "${input.name}"`,
  });
}

export async function setBonusTierActiveAction(
  tierId: string,
  tierName: string,
  isActive: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setBonusTierActive(db, tierId, isActive);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isActive ? "bonusTier.enabled" : "bonusTier.disabled",
    targetType: "bonusTier",
    targetId: tierId,
    details: `${isActive ? "Enabled" : "Disabled"} bonus tier "${tierName}"`,
  });
}

// Approves a pending bonus claim. Firestore transactions can't run the
// aggregate queries (team counts) needed to prove eligibility, so this
// re-verifies the claimant's LIVE team standing — via the same aggregate
// functions the Bonuses/Team pages use — as a pre-check BEFORE starting the
// money-moving transaction, using fresh data, not the claim's own
// self-reported snapshot. If they no longer (or never actually did) meet
// the tier's thresholds, this throws without crediting anything, so the
// admin can reject instead. Once eligibility is confirmed, the transaction
// credits the wallet, writes one completed ledger transaction, marks the
// claim approved, and — only for a "one_time" tier — creates the
// bonusAwards/{uid}_{tierId} marker inside the SAME transaction, re-checking
// its absence right before writing it. That existence-check is the actual
// atomic "never pay the same one-time bonus twice" guarantee (requirement
// 14) — the pre-check above is about correctness of eligibility, not about
// preventing double payment.
export async function approveBonusClaim(claimId: string, reviewer: Reviewer): Promise<void> {
  const db = requireDb();

  const claimSnapPreCheck = await getDoc(bonusClaimDocRef(db, claimId));
  if (!claimSnapPreCheck.exists()) {
    throw new Error("This bonus claim no longer exists.");
  }
  const claim = claimSnapPreCheck.data();
  if (claim.status !== "pending") {
    throw new Error("This bonus claim has already been reviewed.");
  }

  const [tierSnap, userSnapForPackage, totalTeam, activeTeam, levelCounts] = await Promise.all([
    getDoc(bonusTierDocRef(db, claim.tierId)),
    getDoc(userDocRef(db, claim.uid)),
    getTeamTotalCount(db, claim.uid),
    getTeamActiveCount(db, claim.uid),
    getTeamLevelCounts(db, claim.uid),
  ]);
  const directReferrals = levelCounts[1] ?? 0;

  if (!tierSnap.exists()) {
    throw new Error("This bonus tier no longer exists.");
  }
  const tier = tierSnap.data();

  if (!userSnapForPackage.exists()) {
    throw new Error("This user's profile could not be found.");
  }
  const userForPackage = userSnapForPackage.data();

  const eligible =
    directReferrals >= tier.requiredDirectReferrals &&
    totalTeam >= tier.requiredTotalTeam &&
    activeTeam >= tier.requiredActiveTeam &&
    (tier.requiredPackageId == null || userForPackage.package === tier.requiredPackageId);

  if (!eligible) {
    throw new Error(
      "This user no longer meets the tier's requirements. Please reject this claim instead.",
    );
  }

  const txnRef = newTransactionRef(db);
  let capturedAmount = 0;
  let capturedTierName = "";

  await runTransaction(db, async (transaction) => {
    const claimSnap = await transaction.get(bonusClaimDocRef(db, claimId));
    if (!claimSnap.exists()) {
      throw new Error("This bonus claim no longer exists.");
    }
    const freshClaim = claimSnap.data();
    if (freshClaim.status !== "pending") {
      throw new Error("This bonus claim has already been reviewed.");
    }

    const userSnap = await transaction.get(userDocRef(db, freshClaim.uid));
    if (!userSnap.exists()) {
      throw new Error("This user's profile could not be found.");
    }
    const user = userSnap.data();

    const awardRef =
      freshClaim.recurrence === "one_time" ? bonusAwardDocRef(db, freshClaim.uid, freshClaim.tierId) : null;
    if (awardRef) {
      const awardSnap = await transaction.get(awardRef);
      if (awardSnap.exists()) {
        throw new Error("This one-time bonus has already been paid to this user.");
      }
    }

    // Bonus/salary tier payouts are credited to Coca-Cola Earning (same
    // wallet as package daily earnings) — walletBalance is reserved
    // exclusively for top-up deposits and must never receive earned money.
    const newCocaColaEarning = user.cocaColaEarning + freshClaim.bonusAmount;
    const newTotalEarnings = user.totalEarnings + freshClaim.bonusAmount;

    transaction.update(userDocRef(db, freshClaim.uid), {
      cocaColaEarning: newCocaColaEarning,
      totalEarnings: newTotalEarnings,
      updatedAt: serverTimestamp(),
    });
    transaction.update(walletDocRef(db, freshClaim.uid), {
      cocaColaEarning: newCocaColaEarning,
      totalEarnings: newTotalEarnings,
      updatedAt: serverTimestamp(),
    });
    transaction.set(txnRef, {
      uid: freshClaim.uid,
      userName: freshClaim.userName,
      type: "bonus_reward",
      amount: freshClaim.bonusAmount,
      status: "completed",
      description: `Bonus: ${freshClaim.tierName}`,
      wallet: "cocaColaEarning",
      referenceId: claimId,
      createdAt: serverTimestamp(),
    });
    transaction.update(bonusClaimDocRef(db, claimId), {
      status: "approved",
      reviewedBy: reviewer.adminUid,
      updatedAt: serverTimestamp(),
    });

    if (awardRef) {
      transaction.set(awardRef, {
        uid: freshClaim.uid,
        tierId: freshClaim.tierId,
        claimId,
        amount: freshClaim.bonusAmount,
        createdAt: serverTimestamp(),
      });
    }

    capturedAmount = freshClaim.bonusAmount;
    capturedTierName = freshClaim.tierName;
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "bonusClaim.approved",
    targetType: "bonusClaim",
    targetId: claimId,
    details: `Approved a ${formatCurrency(capturedAmount)} bonus ("${capturedTierName}")`,
  });
}

export async function rejectBonusClaim(claimId: string, reviewer: Reviewer): Promise<void> {
  const db = requireDb();

  await runTransaction(db, async (transaction) => {
    const claimSnap = await transaction.get(bonusClaimDocRef(db, claimId));
    if (!claimSnap.exists()) {
      throw new Error("This bonus claim no longer exists.");
    }
    const claim = claimSnap.data();
    if (claim.status !== "pending") {
      throw new Error("This bonus claim has already been reviewed.");
    }

    transaction.update(bonusClaimDocRef(db, claimId), {
      status: "rejected",
      reviewedBy: reviewer.adminUid,
      updatedAt: serverTimestamp(),
    });
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "bonusClaim.rejected",
    targetType: "bonusClaim",
    targetId: claimId,
    details: "Rejected bonus claim",
  });
}
