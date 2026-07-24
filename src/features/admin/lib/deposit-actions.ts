import {
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
} from "firebase/firestore";
import { depositDocRef } from "@/lib/firestore/deposits";
import { userDocRef, type UserDoc } from "@/lib/firestore/users";
import { walletDocRef } from "@/lib/firestore/wallets";
import { newTransactionRef } from "@/lib/firestore/transactions";
import { packageDocRef, type PackageDoc } from "@/lib/firestore/packages";
import { referralRewardDocRef } from "@/lib/firestore/referral-rewards";
import {
  referralLevelSettingDocRef,
  REFERRAL_LEVELS,
  type ReferralLevelSettingDoc,
} from "@/lib/firestore/referral-settings";
import { teamMemberDocRef, buildTeamMemberData, type TeamMemberDoc } from "@/lib/firestore/team-members";
import { newPackagePurchaseRef } from "@/lib/firestore/package-purchases";
import { newSystemNotificationRef, buildSystemNotificationData } from "@/lib/firestore/user-notifications";
import { logActivity } from "@/lib/firestore/activity-logs";
import { formatCurrency } from "@/lib/format";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ChainStep = {
  level: number;
  ancestorUid: string;
  ancestorData: UserDoc;
  ancestorPackageSnap: DocumentSnapshot<PackageDoc> | null;
  teamMemberSnap: DocumentSnapshot<TeamMemberDoc>;
  levelSettingSnap: DocumentSnapshot<ReferralLevelSettingDoc>;
};

// Approves a pending deposit: credits the wallet (both users/{uid} and the
// mirrored wallets/{uid}), writes one completed ledger transaction, and — if
// the deposit was earmarked for a package — activates that package instead
// of crediting spendable balance, records the purchase in the permanent
// packagePurchases history, and pays out the 12-level referral chain below,
// all in one atomic transaction so a mid-way failure can never leave any of
// this out of sync. Re-reads the deposit's own pending state at write time,
// so two concurrent approvals of the same request can't both succeed.
//
// Package activation is "always fresh": activatedAt = this approval's own
// instant, expiresAt = activatedAt + the package's durationDays, always —
// any remaining time on a previous package is discarded, never stacked or
// extended, whether this is a first purchase, a renewal, or an upgrade.
//
// Referral payout: walks the purchaser's users/{uid}.referredBy chain up to
// 12 levels, crediting each qualifying ancestor's Staff Earning wallet
// (never Current Balance/Coca-Cola Earning/Deposit — commissions are
// entirely separate money). For each ancestor reached, their teamMembers record
// for this purchaser is synced with the new package/expiry (regardless of
// whether a reward is paid) so the ancestor's Team page always reflects real
// package state. A reward is paid at a level only if: that level is enabled
// in referralLevelSettings (a missing level document is treated as
// disabled, never defaulted to a hardcoded rate), AND the ancestor
// themselves has an active, unexpired, still-enabled package at this exact
// approval instant — if not, that level is skipped with no redirect to
// another level (per explicit product decision). Reward amount is
// percentage-of-package-price or a fixed Rs amount, per that level's
// configured rewardType, rounded to the nearest rupee; a reward that rounds
// to 0 is not written. Each reward's Firestore doc id is deterministic
// (`${depositId}_L${level}`), so a retried transaction attempt can never
// double-pay the same level for the same purchase.
export async function approveDeposit(
  depositId: string,
  reviewer: Reviewer,
  note?: string | null,
): Promise<void> {
  const db = requireDb();
  const txnRef = newTransactionRef(db);
  const purchaseHistoryRef = newPackagePurchaseRef(db);
  const notificationRef = newSystemNotificationRef(db);

  let capturedAmount = 0;
  let capturedPackageName: string | null = null;
  let capturedReferralTotal = 0;
  let capturedReferralLevelsPaid = 0;

  await runTransaction(db, async (transaction) => {
    const depositSnap = await transaction.get(depositDocRef(db, depositId));
    if (!depositSnap.exists()) {
      throw new Error("This deposit request no longer exists.");
    }
    const deposit = depositSnap.data();
    if (deposit.status !== "pending") {
      throw new Error("This deposit request has already been reviewed.");
    }

    const userRef = userDocRef(db, deposit.uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("This user's profile could not be found.");
    }
    const user = userSnap.data();

    let packageName: string | null = null;
    let durationDays = 0;
    if (deposit.packageId) {
      const packageSnap = await transaction.get(packageDocRef(db, deposit.packageId));
      if (!packageSnap.exists() || !packageSnap.data().isActive) {
        throw new Error("The selected package is no longer available.");
      }
      packageName = packageSnap.data().name;
      durationDays = packageSnap.data().durationDays;
    }

    const activatedAt = Timestamp.now();
    const expiresAt = deposit.packageId
      ? Timestamp.fromMillis(activatedAt.toMillis() + durationDays * MS_PER_DAY)
      : null;

    // --- Read phase: walk the referral chain (reads only, no writes yet —
    // Firestore transactions require every read before any write). ---
    const chain: ChainStep[] = [];
    if (deposit.packageId) {
      let currentUid: string | null = user.referredBy;
      let level = 1;
      while (currentUid && level <= REFERRAL_LEVELS) {
        const ancestorSnap = await transaction.get(userDocRef(db, currentUid));
        if (!ancestorSnap.exists()) break;
        const ancestorData = ancestorSnap.data();

        const ancestorPackageSnap = ancestorData.package
          ? await transaction.get(packageDocRef(db, ancestorData.package))
          : null;
        const teamMemberSnap = await transaction.get(teamMemberDocRef(db, currentUid, deposit.uid));
        const levelSettingSnap = await transaction.get(referralLevelSettingDocRef(db, level));

        chain.push({
          level,
          ancestorUid: currentUid,
          ancestorData,
          ancestorPackageSnap,
          teamMemberSnap,
          levelSettingSnap,
        });

        currentUid = ancestorData.referredBy;
        level++;
      }
    }

    // --- Write phase ---
    if (deposit.packageId) {
      transaction.update(userRef, {
        package: deposit.packageId,
        packagePurchasedAt: deposit.createdAt,
        packageActivatedAt: activatedAt,
        packageExpiresAt: expiresAt,
        pendingPackagePurchaseId: null,
        // "Always fresh" activation resets the daily-earning gate too — the
        // first automatic Coca-Cola Earning credit becomes eligible at the
        // start of the next UTC calendar day after THIS activation (see
        // firestore.rules canClaimDaily/isNewUtcDay), never carried over
        // from a previous package.
        lastDailyClaimAt: activatedAt,
        updatedAt: serverTimestamp(),
      });

      transaction.set(purchaseHistoryRef, {
        uid: deposit.uid,
        packageId: deposit.packageId,
        packageName,
        price: deposit.amount,
        durationDays,
        depositId,
        purchasedAt: deposit.createdAt,
        activatedAt,
        expiresAt,
        createdAt: serverTimestamp(),
      });
    } else {
      const newBalance = user.walletBalance + deposit.amount;
      transaction.update(userRef, {
        walletBalance: newBalance,
        updatedAt: serverTimestamp(),
      });
      transaction.update(walletDocRef(db, deposit.uid), {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });
    }

    transaction.update(depositDocRef(db, depositId), {
      status: "approved",
      reviewedBy: reviewer.adminUid,
      reviewNote: note?.trim() || null,
      updatedAt: serverTimestamp(),
    });

    transaction.set(txnRef, {
      uid: deposit.uid,
      type: deposit.packageId ? "package_purchase" : "deposit",
      amount: deposit.amount,
      status: "completed",
      description: deposit.packageId
        ? `Package purchase: ${packageName}`
        : "Deposit via Easypaisa",
      createdAt: serverTimestamp(),
    });

    transaction.set(
      notificationRef,
      buildSystemNotificationData({
        uid: deposit.uid,
        kind: "deposit",
        title: deposit.packageId ? "Package activated" : "Deposit approved",
        body: deposit.packageId
          ? `Your ${formatCurrency(deposit.amount)} payment was approved and "${packageName}" is now active. Daily Coca-Cola earnings begin tomorrow.`
          : `Your ${formatCurrency(deposit.amount)} deposit was approved and added to your Deposit Wallet.`,
      }),
    );

    let referralTotal = 0;
    let referralLevelsPaid = 0;

    for (const step of chain) {
      // `chain` is only ever populated inside the `if (deposit.packageId)`
      // branch above, so this is always true here — narrows the type for
      // the referralRewards write below, which requires a non-null packageId.
      if (!deposit.packageId) continue;

      // Always sync this purchaser's package info under this ancestor's team
      // view, regardless of whether a reward is paid at this level.
      if (step.teamMemberSnap.exists()) {
        transaction.update(step.teamMemberSnap.ref, {
          packageId: deposit.packageId,
          packageName,
          packageExpiresAt: expiresAt,
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(
          step.teamMemberSnap.ref,
          buildTeamMemberData({
            ancestorUid: step.ancestorUid,
            memberUid: deposit.uid,
            memberName: deposit.userName,
            level: step.level,
            joinedAt: user.createdAt,
            packageId: deposit.packageId,
            packageName,
            packageExpiresAt: expiresAt,
          }),
        );
      }

      const levelSetting = step.levelSettingSnap.exists() ? step.levelSettingSnap.data() : null;
      if (!levelSetting || !levelSetting.enabled) continue;

      const ancestorData = step.ancestorData;
      const ancestorQualified =
        ancestorData.package != null &&
        ancestorData.packageExpiresAt != null &&
        ancestorData.packageExpiresAt.toMillis() > activatedAt.toMillis() &&
        step.ancestorPackageSnap != null &&
        step.ancestorPackageSnap.exists() &&
        step.ancestorPackageSnap.data().isActive === true;
      if (!ancestorQualified) continue;

      const rawAmount =
        levelSetting.rewardType === "percentage"
          ? (deposit.amount * levelSetting.rewardValue) / 100
          : levelSetting.rewardValue;
      const amount = Math.round(rawAmount);
      if (amount <= 0) continue;

      const newStaffEarning = ancestorData.staffEarning + amount;
      const newTotalEarnings = ancestorData.totalEarnings + amount;

      transaction.update(userDocRef(db, step.ancestorUid), {
        staffEarning: newStaffEarning,
        totalEarnings: newTotalEarnings,
        updatedAt: serverTimestamp(),
      });
      transaction.update(walletDocRef(db, step.ancestorUid), {
        staffEarning: newStaffEarning,
        totalEarnings: newTotalEarnings,
        updatedAt: serverTimestamp(),
      });
      transaction.set(referralRewardDocRef(db, depositId, step.level), {
        earnerUid: step.ancestorUid,
        earnerName: ancestorData.fullName,
        sourceUid: deposit.uid,
        sourceName: deposit.userName,
        level: step.level,
        amount,
        rewardType: levelSetting.rewardType,
        rewardValue: levelSetting.rewardValue,
        packageId: deposit.packageId,
        packagePrice: deposit.amount,
        depositId,
        status: "credited",
        createdAt: serverTimestamp(),
      });
      transaction.set(newTransactionRef(db), {
        uid: step.ancestorUid,
        type: "referral_reward",
        amount,
        status: "completed",
        description: `Level ${step.level} referral bonus from ${deposit.userName}'s package purchase`,
        createdAt: serverTimestamp(),
      });

      referralTotal += amount;
      referralLevelsPaid += 1;
    }

    capturedAmount = deposit.amount;
    capturedPackageName = packageName;
    capturedReferralTotal = referralTotal;
    capturedReferralLevelsPaid = referralLevelsPaid;
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "deposit.approved",
    targetType: "deposit",
    targetId: depositId,
    details:
      (capturedPackageName
        ? `Approved a ${formatCurrency(capturedAmount)} deposit and activated package "${capturedPackageName}"${
            capturedReferralLevelsPaid > 0
              ? ` (referral bonuses paid across ${capturedReferralLevelsPaid} level(s): ${formatCurrency(capturedReferralTotal)})`
              : ""
          }`
        : `Approved a ${formatCurrency(capturedAmount)} deposit`) + (note?.trim() ? ` — note: ${note.trim()}` : ""),
  });
}

export async function rejectDeposit(
  depositId: string,
  reviewer: Reviewer,
  note?: string | null,
): Promise<void> {
  const db = requireDb();
  const notificationRef = newSystemNotificationRef(db);

  await runTransaction(db, async (transaction) => {
    const depositSnap = await transaction.get(depositDocRef(db, depositId));
    if (!depositSnap.exists()) {
      throw new Error("This deposit request no longer exists.");
    }
    const deposit = depositSnap.data();
    if (deposit.status !== "pending") {
      throw new Error("This deposit request has already been reviewed.");
    }

    transaction.update(depositDocRef(db, depositId), {
      status: "rejected",
      reviewedBy: reviewer.adminUid,
      reviewNote: note?.trim() || null,
      updatedAt: serverTimestamp(),
    });

    // A rejected package-purchase deposit must free up the requester's
    // pending-purchase marker so they can try again.
    if (deposit.packageId) {
      transaction.update(userDocRef(db, deposit.uid), {
        pendingPackagePurchaseId: null,
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(
      notificationRef,
      buildSystemNotificationData({
        uid: deposit.uid,
        kind: "deposit",
        title: deposit.packageId ? "Package purchase rejected" : "Deposit rejected",
        body: note?.trim()
          ? `Your ${formatCurrency(deposit.amount)} ${deposit.packageId ? "package purchase" : "deposit"} was rejected: ${note.trim()}`
          : `Your ${formatCurrency(deposit.amount)} ${deposit.packageId ? "package purchase" : "deposit"} was rejected. Please contact support for details.`,
      }),
    );
  });

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "deposit.rejected",
    targetType: "deposit",
    targetId: depositId,
    details: "Rejected deposit request" + (note?.trim() ? ` — note: ${note.trim()}` : ""),
  });
}
