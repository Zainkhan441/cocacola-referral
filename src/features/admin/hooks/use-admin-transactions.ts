"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  adminTransactionsPageQuery,
  TRANSACTIONS_PAGE_SIZE,
  type TransactionDoc,
  type TransactionTypeFilter,
} from "@/lib/firestore/transactions";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type TransactionWithId = TransactionDoc & { id: string };

type UseAdminTransactionsResult = {
  transactions: TransactionWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

// The admin Financial History ledger — every wallet movement the platform
// has ever made, paginated and optionally filtered by type. Mirrors
// useAdminWithdrawals/useAdminDeposits exactly.
export function useAdminTransactions(typeFilter: TransactionTypeFilter): UseAdminTransactionsResult {
  const canFetch = Boolean(db);

  const [transactions, setTransactions] = useState<TransactionWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<TransactionDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${typeFilter}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setTransactions([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    getDocs(adminTransactionsPageQuery(firestore, typeFilter, null))
      .then((snapshot) => {
        if (cancelled) return;
        setTransactions(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === TRANSACTIONS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load the transaction history. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, typeFilter, attempt]);

  async function loadMore() {
    if (!db || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(adminTransactionsPageQuery(db, typeFilter, cursor));
      setTransactions((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === TRANSACTIONS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more transactions. Please try again.");
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
