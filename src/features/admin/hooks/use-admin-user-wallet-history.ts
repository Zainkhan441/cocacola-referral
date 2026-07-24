"use client";

import { useEffect, useState } from "react";
import { getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { recentTransactionsQuery, type TransactionDoc } from "@/lib/firestore/transactions";
import { recentDepositsQuery, type DepositDoc } from "@/lib/firestore/deposits";
import { recentWithdrawalsQuery, type WithdrawalDoc } from "@/lib/firestore/withdrawals";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseAdminUserWalletHistoryResult = {
  transactions: TransactionDoc[];
  deposits: DepositDoc[];
  withdrawals: WithdrawalDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// A one-shot snapshot of a specific user's recent activity, for the admin
// user-detail view — not live, refresh via retry().
export function useAdminUserWalletHistory(uid: string): UseAdminUserWalletHistoryResult {
  const canFetch = Boolean(db && uid);

  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [deposits, setDeposits] = useState<DepositDoc[]>([]);
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
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;

    Promise.all([
      getDocs(recentTransactionsQuery(firestore, uid)),
      getDocs(recentDepositsQuery(firestore, uid)),
      getDocs(recentWithdrawalsQuery(firestore, uid)),
    ])
      .then(([transactionsSnap, depositsSnap, withdrawalsSnap]) => {
        if (cancelled) return;
        setTransactions(transactionsSnap.docs.map((doc) => doc.data()));
        setDeposits(depositsSnap.docs.map((doc) => doc.data()));
        setWithdrawals(withdrawalsSnap.docs.map((doc) => doc.data()));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load this user’s wallet history. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { transactions, deposits, withdrawals, loading: canFetch ? loading : false, error, retry };
}
