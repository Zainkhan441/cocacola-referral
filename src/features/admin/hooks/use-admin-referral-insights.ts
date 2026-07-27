"use client";

import { useEffect, useState } from "react";
import { getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userDocRef } from "@/lib/firestore/users";
import { getDirectTotalReferralCount, getDirectActiveReferralCount } from "@/lib/firestore/team-members";
import { getReferralEarningsTotal } from "@/lib/firestore/referral-rewards";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type AdminReferralInsights = {
  referrerName: string | null;
  referrerEmail: string | null;
  directTotal: number;
  directActive: number;
  totalCommissionGenerated: number;
};

type UseAdminReferralInsightsResult = {
  insights: AdminReferralInsights | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Admin-only referral visibility for a single user's detail page: who
// referred them, how many direct referrals they themselves have brought in
// (and how many are active), and the total commission they've generated as
// a referrer — all live-queried, never from a stored counter.
export function useAdminReferralInsights(
  uid: string,
  referredBy: string | null,
): UseAdminReferralInsightsResult {
  const canFetch = Boolean(db && uid);

  const [insights, setInsights] = useState<AdminReferralInsights | null>(null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${uid}:${referredBy}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    Promise.all([
      referredBy ? getDoc(userDocRef(firestore, referredBy)) : Promise.resolve(null),
      getDirectTotalReferralCount(firestore, uid),
      getDirectActiveReferralCount(firestore, uid),
      getReferralEarningsTotal(firestore, uid),
    ])
      .then(([referrerSnap, directTotal, directActive, totalCommissionGenerated]) => {
        if (cancelled) return;
        const referrerData = referrerSnap?.exists() ? referrerSnap.data() : null;
        setInsights({
          referrerName: referrerData?.fullName ?? null,
          referrerEmail: referrerData?.email ?? null,
          directTotal,
          directActive,
          totalCommissionGenerated,
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load referral insights for this user.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, referredBy, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { insights, loading: canFetch ? loading : false, error, retry };
}
