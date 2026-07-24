"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getReferralEarningsTotal } from "@/lib/firestore/referral-rewards";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseReferralEarningsResult = {
  total: number | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useReferralEarnings(): UseReferralEarningsResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [total, setTotal] = useState<number | null>(null);
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

    let cancelled = false;

    getReferralEarningsTotal(db, uid)
      .then((value) => {
        if (cancelled) return;
        setTotal(value);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your referral earnings. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { total, loading: canFetch ? loading : false, error, retry };
}
