"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  adminBonusClaimsPageQuery,
  BONUS_CLAIMS_PAGE_SIZE,
  type BonusClaimDoc,
  type BonusClaimStatusFilter,
} from "@/lib/firestore/bonus-claims";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type BonusClaimWithId = BonusClaimDoc & { id: string };

type UseAdminBonusClaimsResult = {
  claims: BonusClaimWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useAdminBonusClaims(statusFilter: BonusClaimStatusFilter): UseAdminBonusClaimsResult {
  const canFetch = Boolean(db);

  const [claims, setClaims] = useState<BonusClaimWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<BonusClaimDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${statusFilter}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setClaims([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    getDocs(adminBonusClaimsPageQuery(firestore, statusFilter, null))
      .then((snapshot) => {
        if (cancelled) return;
        setClaims(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === BONUS_CLAIMS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load bonus claims. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, statusFilter, attempt]);

  async function loadMore() {
    if (!db || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(adminBonusClaimsPageQuery(db, statusFilter, cursor));
      setClaims((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === BONUS_CLAIMS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more bonus claims. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    claims,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
