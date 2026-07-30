"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getWithdrawalTotalByStatus } from "@/lib/firestore/withdrawals";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type WithdrawalTotals = {
  approved: number;
  pending: number;
  rejected: number;
};

type UseWithdrawalTotalsResult = {
  totals: WithdrawalTotals | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Powers the Wallet page's three withdraw stat tiles (Approved/Pending/
// Rejected), matching the reference wallet layout — each a live sum of the
// user's own withdrawal request amounts in that status.
export function useWithdrawalTotals(): UseWithdrawalTotalsResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [totals, setTotals] = useState<WithdrawalTotals | null>(null);
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

    Promise.all([
      getWithdrawalTotalByStatus(firestore, uid, "approved"),
      getWithdrawalTotalByStatus(firestore, uid, "pending"),
      getWithdrawalTotalByStatus(firestore, uid, "rejected"),
    ])
      .then(([approved, pending, rejected]) => {
        if (cancelled) return;
        setTotals({ approved, pending, rejected });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your withdrawal totals. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { totals, loading: canFetch ? loading : false, error, retry };
}
