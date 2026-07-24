"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  depositsByStatusPageQuery,
  depositsPageQuery,
  DEPOSITS_PAGE_SIZE,
  type DepositDoc,
  type DepositStatus,
} from "@/lib/firestore/deposits";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type DepositStatusFilter = DepositStatus | "all";
export type DepositWithId = DepositDoc & { id: string };

type UseAdminDepositsResult = {
  deposits: DepositWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useAdminDeposits(status: DepositStatusFilter): UseAdminDepositsResult {
  const canFetch = Boolean(db);

  const [deposits, setDeposits] = useState<DepositWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DepositDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${status}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setDeposits([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    const initialQuery =
      status === "all"
        ? depositsPageQuery(firestore, null)
        : depositsByStatusPageQuery(firestore, status, null);

    getDocs(initialQuery)
      .then((snapshot) => {
        if (cancelled) return;
        setDeposits(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === DEPOSITS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load deposit requests. Please try again.");
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
          ? depositsPageQuery(db, cursor)
          : depositsByStatusPageQuery(db, status, cursor);
      const snapshot = await getDocs(nextQuery);
      setDeposits((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === DEPOSITS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more deposit requests. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    deposits,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
