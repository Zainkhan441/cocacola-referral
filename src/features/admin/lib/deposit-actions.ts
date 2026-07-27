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
import { packageDocRef } from "@/lib/firestore/packages";
import { referralRewardDocRef } from "@/lib/firestore/referral-rewards";
import { teamMemberDocRef, buildTeamMemberData, REFERRAL_LEVELS, type TeamMemberDoc } from "@/lib/firestore/team-members";
import { newPackagePurchaseRef } from "@/lib/firestore/package-purchases";
import { newSystemNotificationRef, buildSystemNotificationData } from "@/lib/firestore/user-notifications";
import { logActivity } from "@/lib/firestore/activity-logs";
import { formatCurrency } from "@/lib/format";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

type ChainStep = {
  level: number;
  ancestorUid: string;
  ancestorData: UserDoc;
  teamMemberSnap: DocumentSnapshot<TeamMemberDoc>;
};

// Approves a pending deposit: credits the wallet (both users/{uid} and the
// mirrored wallets/{uid}), writes one completed ledger transaction, and — if
// the deposit was earmarked for a package — activates that package instead
// of crediting spendable balance, records the purchase in the permanent
// packagePurchases history, and pays a flat referral commission to the
// purchaser's DIRECT referrer only (not a multi-level payout), all in one
// atomic transaction so a mid-way failure can never leave any of this out of
// sync. Re-reads the deposit's own pending state at write time, so two
// concurrent approvals of the same request can't both succeed.
//
// Package activation is "always fresh": activatedAt = this approval's own
// instant, always — any previous package assignment is discarded, never
// stacked or extended. Packages never expire (packageExpiresAt is always
// null going forward) — a package only stops qualifying a user if an admin
// disables it (package.isActive = false) or the user purchases a different
// one.
//
// Referral commission: paid once, to the purchaser's own users/{uid}.referredBy
// (level 1 only — never walked further up the chain), a flat Rs amount from
// the purchased package's own referralCommission field. No condition on the
// referrer's own package status — the commission is paid whenever a direct
// referral's package purchase is approved, full stop. The ancestor chain is
// still walked up to REFERRAL_LEVELS beyond that, but only to keep each
// ancestor's teamMembers "downline" record in sync for display — that sync
// is unconditional and carries no money.
//
// FINAL BUSINESS RULE: Staff Earning is not a separate wallet. The
// commission is credited directly into the direct referrer's Current
// Balance (real, withdrawable money, subject to the exact same Rs 500
// minimum/no-Level-requirement withdrawal rules as any other Current
// Balance credit) — never into users/{uid}.staffEarning, which this
// function no longer writes to at all. "Staff Earning" as a UI concept is
// now purely a reporting view computed from the referralRewards collection
// and each teamMembers record's own commissionEarned running total, so
// there is exactly one place money is ever added, but it can be displayed
// from two different queries.
//
// Idempotency: the referralRewards/{depositId} document — id is literally
// the depositId — can only ever be created once (firestore.rules denies any
// update/delete on it), so even a hand-crafted duplicate write attempt is
// rejected at the rules layer. On top of that (belt-and-suspenders, per
// explicit product requirement), this transaction explicitly reads that
// document first and skips crediting entirely if it already exists — so a
// retried/duplicated approveDeposit call is a safe no-op for the commission,
// independent of (in addition to) the deposit.status "already reviewed"
// guard above.
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
  let capturedReferralCommission = 0;
  let capturedReferralPaid = false;

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
    let referralCommission = 0;
    // Snapshotted onto the user doc below (packageDailyEarning/
    // packageDailyTaskLimit) so a later admin edit to this package's
    // template never retroactively changes what THIS holder already earns —
    // see UserDoc's doc comment on those two fields.
    let packageDailyEarning: number | null = null;
    let packageDailyTaskLimit: number | null = null;
    if (deposit.packageId) {
      const packageSnap = await transaction.get(packageDocRef(db, deposit.packageId));
      if (!packageSnap.exists() || !packageSnap.data().isActive) {
        throw new Error("The selected package is no longer available.");
      }
      const pkg = packageSnap.data();
      packageName = pkg.name;
      referralCommission = pkg.referralCommission;
      packageDailyEarning = pkg.dailyEarning;
      packageDailyTaskLimit = pkg.dailyTaskLimit;
    }

    const activatedAt = Timestamp.now();

    // --- Read phase: walk the referral chain (reads only, no writes yet —
    // Firestore transactions require every read before any write). Only
    // chain[0] (the direct referrer) is ever paid; the rest of the chain is
    // walked purely to keep each ancestor's teamMembers display in sync. ---
    const chain: ChainStep[] = [];
    if (deposit.packageId) {
      let currentUid: string | null = user.referredBy;
      let level = 1;
      while (currentUid && level <= REFERRAL_LEVELS) {
        const ancestorSnap = await transaction.get(userDocRef(db, currentUid));
        if (!ancestorSnap.exists()) break;
        const ancestorData = ancestorSnap.data();

        const teamMemberSnap = await transaction.get(teamMemberDocRef(db, currentUid, deposit.uid));

        chain.push({ level, ancestorUid: currentUid, ancestorData, teamMemberSnap });

        currentUid = ancestorData.referredBy;
        level++;
      }
    }

    // Idempotency belt-and-suspenders: read the commission record for THIS
    // deposit before any write. deposit.status already prevents a retried
    // call from reaching this point at all (see the "already reviewed"
    // throw above), and the referralRewards/{depositId} doc id makes a
    // duplicate create impossible at the rules layer regardless — this read
    // is a third, independent guard against ever crediting twice.
    const referralRewardRef = referralRewardDocRef(db, depositId);
    const existingReferralRewardSnap = deposit.packageId
      ? await transaction.get(referralRewardRef)
      : null;

    // --- Write phase ---
    if (deposit.packageId) {
      transaction.update(userRef, {
        package: deposit.packageId,
        packagePurchasedAt: deposit.createdAt,
        packageActivatedAt: activatedAt,
        packageExpiresAt: null,
        packageDailyEarning,
        packageDailyTaskLimit,
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
        depositId,
        purchasedAt: deposit.createdAt,
        activatedAt,
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
      userName: deposit.userName,
      type: deposit.packageId ? "package_purchase" : "deposit",
      amount: deposit.amount,
      status: "completed",
      description: deposit.packageId
        ? `Package purchase: ${packageName}`
        : "Deposit via Easypaisa",
      // A package-purchase deposit activates a package rather than crediting
      // any single wallet balance — walletBalance is the Deposit Wallet a
      // plain top-up lands in.
      wallet: deposit.packageId ? null : "walletBalance",
      referenceId: depositId,
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

    // Referral commission eligibility: the direct referrer (chain[0]) only,
    // a flat amount from the package itself — never walked further up the
    // chain — and only once per deposit (see existingReferralRewardSnap
    // above).
    const directReferrer = chain.length > 0 ? chain[0] : null;
    const commissionPayable =
      deposit.packageId != null &&
      directReferrer != null &&
      referralCommission > 0 &&
      !existingReferralRewardSnap?.exists();

    // Sync every ancestor's teamMembers "downline" record regardless of
    // whether a reward is paid — this is a display-only view of the
    // network, independent of the referral commission below. Only the
    // direct referrer's (level 1) record additionally gets the
    // packagePrice/packageApprovedAt/commissionEarned fields the Staff
    // Earning referral list displays, since only level 1 is ever paid.
    for (const step of chain) {
      if (!deposit.packageId) continue;

      const isDirectReferrer = step.level === 1;
      const commissionForThisMember = isDirectReferrer && commissionPayable ? referralCommission : 0;

      if (step.teamMemberSnap.exists()) {
        transaction.update(step.teamMemberSnap.ref, {
          packageId: deposit.packageId,
          packageName,
          packageExpiresAt: null,
          ...(isDirectReferrer && {
            packagePrice: deposit.amount,
            packageApprovedAt: activatedAt,
            commissionEarned: (step.teamMemberSnap.data()?.commissionEarned ?? 0) + commissionForThisMember,
          }),
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(
          step.teamMemberSnap.ref,
          buildTeamMemberData({
            ancestorUid: step.ancestorUid,
            memberUid: deposit.uid,
            memberName: deposit.userName,
            memberEmail: user.email,
            level: step.level,
            joinedAt: user.createdAt,
            packageId: deposit.packageId,
            packageName,
            packageExpiresAt: null,
            packagePrice: isDirectReferrer ? deposit.amount : null,
            packageApprovedAt: isDirectReferrer ? activatedAt : null,
            commissionEarned: commissionForThisMember,
          }),
        );
      }
    }

    // Referral commission: credited into the direct referrer's Current
    // Balance — the ONLY wallet this money ever lands in (see this
    // function's top-level doc comment for the full "Staff Earning is not
    // a separate wallet" rationale). referralRewards is the reporting
    // record of where it came from, not a second pool of money.
    if (commissionPayable && directReferrer && deposit.packageId && packageName) {
      const ancestorData = directReferrer.ancestorData;
      const newCurrentBalance = ancestorData.currentBalance + referralCommission;
      const newTotalEarnings = ancestorData.totalEarnings + referralCommission;

      transaction.update(userDocRef(db, directReferrer.ancestorUid), {
        currentBalance: newCurrentBalance,
        totalEarnings: newTotalEarnings,
        updatedAt: serverTimestamp(),
      });
      transaction.update(walletDocRef(db, directReferrer.ancestorUid), {
        currentBalance: newCurrentBalance,
        totalEarnings: newTotalEarnings,
        updatedAt: serverTimestamp(),
      });

      transaction.set(referralRewardRef, {
        earnerUid: directReferrer.ancestorUid,
        earnerName: ancestorData.fullName,
        sourceUid: deposit.uid,
        sourceName: deposit.userName,
        amount: referralCommission,
        packageId: deposit.packageId,
        packageName,
        packagePrice: deposit.amount,
        depositId,
        status: "credited",
        createdAt: serverTimestamp(),
      });
      transaction.set(newTransactionRef(db), {
        uid: directReferrer.ancestorUid,
        userName: ancestorData.fullName,
        type: "referral_reward",
        amount: referralCommission,
        status: "completed",
        description: `Referral commission from ${deposit.userName}'s package purchase`,
        wallet: "currentBalance",
        referenceId: referralRewardRef.id,
        createdAt: serverTimestamp(),
      });

      capturedReferralCommission = referralCommission;
      capturedReferralPaid = true;
    }

    capturedAmount = deposit.amount;
    capturedPackageName = packageName;
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
            capturedReferralPaid
              ? ` (referral commission paid: ${formatCurrency(capturedReferralCommission)})`
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
