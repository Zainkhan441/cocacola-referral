"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getDirectTotalReferralCount, getDirectActiveReferralCount } from "@/lib/firestore/team-members";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type DirectReferralCounts = {
  total: number;
  active: number;
  // Signed up under this referrer but their package purchase hasn't been
  // approved yet (or they haven't purchased at all) — total minus active,
  // never separately queried.
  pending: number;
};

type UseDirectReferralCountsResult = {
  counts: DirectReferralCounts | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Live counts of the caller's own DIRECT (level 1) referrals — the figures
// the Staff Earning section and Level system are built on. Deliberately
// NOT sourced from users/{uid}.totalReferrals/activeReferrals, which are
// never written by anything (see users.ts) and would always read 0.
export function useDirectReferralCounts(): UseDirectReferralCountsResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [counts, setCounts] = useState<DirectReferralCounts | null>(null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${uid}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db || !uid) return;
    const firestore = db;

    let cancelled = false;
    Promise.all([getDirectTotalReferralCount(firestore, uid), getDirectActiveReferralCount(firestore, uid)])
      .then(([total, active]) => {
        if (cancelled) return;
        setCounts({ total, active, pending: Math.max(0, total - active) });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your referral counts. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { counts, loading: canFetch ? loading : false, error, retry };
}
