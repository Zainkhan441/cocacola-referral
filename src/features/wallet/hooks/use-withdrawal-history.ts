"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { recentWithdrawalsQuery, type WithdrawalDoc } from "@/lib/firestore/withdrawals";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseWithdrawalHistoryResult = {
  withdrawals: WithdrawalDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Live subscription to this account's own most recent withdrawal requests,
// every status included (pending/approved/rejected/paid) — status
// filtering, where a consumer wants it, is that consumer's own concern
// (see wallet/components/transaction-history.tsx, which still excludes
// rejected for the Wallet page's own "Withdraw history" card) rather than
// baked into this shared hook, so the exact same query/listener can also
// back the Dashboard's unfiltered Withdrawal History card without a second
// subscription implementation.
export function useWithdrawalHistory(): UseWithdrawalHistoryResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [withdrawals, setWithdrawals] = useState<WithdrawalDoc[]>([]);
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

    const unsubscribe = onSnapshot(
      recentWithdrawalsQuery(db, uid),
      (snapshot) => {
        setWithdrawals(snapshot.docs.map((doc) => doc.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load your withdrawal history. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { withdrawals, loading: canFetch ? loading : false, error, retry };
}
