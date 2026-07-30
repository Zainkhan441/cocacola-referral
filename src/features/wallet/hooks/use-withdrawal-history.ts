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

// Live subscription to this account's own withdrawal requests, filtered to
// pending + approved only — rejected requests are deliberately excluded
// here (Rejected Withdraw remains visible only as a Wallet summary tile,
// per product decision). Reads recentWithdrawalsQuery (uid + createdAt,
// unfiltered by status) rather than a status-filtered query so approvals/
// rejections update live in place without a second listener.
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
        setWithdrawals(snapshot.docs.map((doc) => doc.data()).filter((w) => w.status !== "rejected"));
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
