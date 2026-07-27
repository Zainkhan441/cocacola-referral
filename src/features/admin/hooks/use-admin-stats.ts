"use client";

import { useEffect, useState } from "react";
import { getAggregateFromServer, getCountFromServer, query, sum, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { usersCollection } from "@/lib/firestore/users";
import { depositsCollection } from "@/lib/firestore/deposits";
import { withdrawalsCollection } from "@/lib/firestore/withdrawals";
import { referralRewardsCollection } from "@/lib/firestore/referral-rewards";
import { transactionsByTypeQuery, dailyRewardTransactionsSinceQuery } from "@/lib/firestore/transactions";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";
import { startOfUtcDay } from "@/lib/date-utils";

export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  // Count of users with a package currently assigned (packages never
  // expire, so this is presence, not a time-bounded check).
  activePackages: number;
  // Sum of approved deposit amounts (money that has flowed into wallets).
  totalDeposits: number;
  pendingDeposits: number;
  approvedDeposits: number;
  // Sum of approved withdrawal amounts (money paid out).
  totalWithdrawals: number;
  pendingWithdrawals: number;
  // Sum of completed package_purchase transactions — real Rs 0 until the
  // package-purchase-via-deposit flow has any approved requests.
  totalRevenue: number;
  // Sum across every user's referralRewards — real Rs 0 until the referral
  // crediting engine (a later milestone) exists.
  totalReferralRewards: number;
  // Sum of daily_reward transactions created since the start of today (UTC),
  // matching the same calendar-day boundary the earning engine itself uses.
  todayEarningsPaid: number;
  // Total money currently sitting in each wallet, platform-wide — a live
  // snapshot of platform liability, not a lifetime/historical figure.
  platformDepositWallet: number;
  platformCurrentBalance: number;
  platformCocaColaEarning: number;
  platformStaffEarning: number;
};

type UseAdminStatsResult = {
  stats: AdminStats | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminStats(): UseAdminStatsResult {
  const canFetch = Boolean(db);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;

    async function load() {
      const todayStartMs = startOfUtcDay(Date.now());

      const [
        totalUsersSnap,
        activeUsersSnap,
        activePackagesSnap,
        approvedDepositsAggSnap,
        pendingDepositsSnap,
        approvedDepositsSnap,
        approvedWithdrawalsAggSnap,
        pendingWithdrawalsSnap,
        revenueAggSnap,
        referralRewardsAggSnap,
        todayEarningsAggSnap,
        platformDepositWalletAggSnap,
        platformCurrentBalanceAggSnap,
        platformCocaColaEarningAggSnap,
        platformStaffEarningAggSnap,
      ] = await Promise.all([
        getCountFromServer(usersCollection(firestore)),
        getCountFromServer(query(usersCollection(firestore), where("accountStatus", "==", "active"))),
        getCountFromServer(
          query(usersCollection(firestore), where("package", "!=", null)),
        ),
        getAggregateFromServer(
          query(depositsCollection(firestore), where("status", "==", "approved")),
          { total: sum("amount") },
        ),
        getCountFromServer(query(depositsCollection(firestore), where("status", "==", "pending"))),
        getCountFromServer(query(depositsCollection(firestore), where("status", "==", "approved"))),
        getAggregateFromServer(
          query(withdrawalsCollection(firestore), where("status", "==", "approved")),
          { total: sum("amount") },
        ),
        getCountFromServer(query(withdrawalsCollection(firestore), where("status", "==", "pending"))),
        getAggregateFromServer(
          query(transactionsByTypeQuery(firestore, "package_purchase"), where("status", "==", "completed")),
          { total: sum("amount") },
        ),
        getAggregateFromServer(referralRewardsCollection(firestore), { total: sum("amount") }),
        getAggregateFromServer(dailyRewardTransactionsSinceQuery(firestore, todayStartMs), {
          total: sum("amount"),
        }),
        getAggregateFromServer(usersCollection(firestore), { total: sum("walletBalance") }),
        getAggregateFromServer(usersCollection(firestore), { total: sum("currentBalance") }),
        getAggregateFromServer(usersCollection(firestore), { total: sum("cocaColaEarning") }),
        getAggregateFromServer(usersCollection(firestore), { total: sum("staffEarning") }),
      ]);

      if (cancelled) return;

      setStats({
        totalUsers: totalUsersSnap.data().count,
        activeUsers: activeUsersSnap.data().count,
        activePackages: activePackagesSnap.data().count,
        // Firestore's sum() aggregate resolves to `null`, not 0, when zero
        // documents match the query (e.g. no approved deposits yet) — a
        // real, reproducible gap between the SDK's declared `number` return
        // type and its actual runtime value. Normalized to 0 here, at the
        // data layer, rather than trusting the aggregate's type.
        totalDeposits: approvedDepositsAggSnap.data().total ?? 0,
        pendingDeposits: pendingDepositsSnap.data().count,
        approvedDeposits: approvedDepositsSnap.data().count,
        totalWithdrawals: approvedWithdrawalsAggSnap.data().total ?? 0,
        pendingWithdrawals: pendingWithdrawalsSnap.data().count,
        totalRevenue: revenueAggSnap.data().total ?? 0,
        totalReferralRewards: referralRewardsAggSnap.data().total ?? 0,
        todayEarningsPaid: todayEarningsAggSnap.data().total ?? 0,
        platformDepositWallet: platformDepositWalletAggSnap.data().total ?? 0,
        platformCurrentBalance: platformCurrentBalanceAggSnap.data().total ?? 0,
        platformCocaColaEarning: platformCocaColaEarningAggSnap.data().total ?? 0,
        platformStaffEarning: platformStaffEarningAggSnap.data().total ?? 0,
      });
      setLoading(false);
    }

    load().catch(() => {
      if (cancelled) return;
      setError("We couldn’t load dashboard statistics. Please try again.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { stats, loading: canFetch ? loading : false, error, retry };
}
