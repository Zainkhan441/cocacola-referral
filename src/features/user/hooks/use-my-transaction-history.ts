"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  myTransactionsPageQuery,
  TRANSACTIONS_PAGE_SIZE,
  type TransactionDoc,
  type TransactionTypeFilter,
} from "@/lib/firestore/transactions";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type TransactionWithId = TransactionDoc & { id: string };

type UseMyTransactionHistoryResult = {
  transactions: TransactionWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

// The complete, paginated Transaction History for the signed-in user
// (distinct from RecentTransactions' live 5-item dashboard preview) —
// every deposit, withdrawal, referral commission, daily earning, task
// reward, bonus, and admin adjustment that has ever touched their wallets.
export function useMyTransactionHistory(
  typeFilter: TransactionTypeFilter,
): UseMyTransactionHistoryResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [transactions, setTransactions] = useState<TransactionWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<TransactionDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${uid}:${typeFilter}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setTransactions([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db || !uid) return;
    const firestore = db;

    let cancelled = false;
    getDocs(myTransactionsPageQuery(firestore, uid, typeFilter, null))
      .then((snapshot) => {
        if (cancelled) return;
        setTransactions(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === TRANSACTIONS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your transaction history. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, typeFilter, attempt]);

  async function loadMore() {
    if (!db || !uid || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(myTransactionsPageQuery(db, uid, typeFilter, cursor));
      setTransactions((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === TRANSACTIONS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more of your transaction history. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    transactions,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
