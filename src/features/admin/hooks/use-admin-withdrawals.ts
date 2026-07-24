"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  withdrawalsByStatusPageQuery,
  withdrawalsPageQuery,
  WITHDRAWALS_PAGE_SIZE,
  type WithdrawalDoc,
  type WithdrawalStatus,
} from "@/lib/firestore/withdrawals";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type WithdrawalStatusFilter = WithdrawalStatus | "all";
export type WithdrawalWithId = WithdrawalDoc & { id: string };

type UseAdminWithdrawalsResult = {
  withdrawals: WithdrawalWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useAdminWithdrawals(status: WithdrawalStatusFilter): UseAdminWithdrawalsResult {
  const canFetch = Boolean(db);

  const [withdrawals, setWithdrawals] = useState<WithdrawalWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<WithdrawalDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${status}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setWithdrawals([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    const initialQuery =
      status === "all"
        ? withdrawalsPageQuery(firestore, null)
        : withdrawalsByStatusPageQuery(firestore, status, null);

    getDocs(initialQuery)
      .then((snapshot) => {
        if (cancelled) return;
        setWithdrawals(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === WITHDRAWALS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load withdrawal requests. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, status, attempt]);

  async function loadMore() {
    if (!db || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextQuery =
        status === "all"
          ? withdrawalsPageQuery(db, cursor)
          : withdrawalsByStatusPageQuery(db, status, cursor);
      const snapshot = await getDocs(nextQuery);
      setWithdrawals((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === WITHDRAWALS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more withdrawal requests. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    withdrawals,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
