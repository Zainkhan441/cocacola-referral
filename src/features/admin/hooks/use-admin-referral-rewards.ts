"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  adminReferralRewardsPageQuery,
  REFERRAL_REWARDS_PAGE_SIZE,
  type ReferralRewardDoc,
  type RewardLevelFilter,
} from "@/lib/firestore/referral-rewards";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type ReferralRewardWithId = ReferralRewardDoc & { id: string };

type UseAdminReferralRewardsResult = {
  rewards: ReferralRewardWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useAdminReferralRewards(levelFilter: RewardLevelFilter): UseAdminReferralRewardsResult {
  const canFetch = Boolean(db);

  const [rewards, setRewards] = useState<ReferralRewardWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<ReferralRewardDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${levelFilter}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setRewards([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    getDocs(adminReferralRewardsPageQuery(firestore, levelFilter, null))
      .then((snapshot) => {
        if (cancelled) return;
        setRewards(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === REFERRAL_REWARDS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load referral reward logs. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, levelFilter, attempt]);

  async function loadMore() {
    if (!db || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(adminReferralRewardsPageQuery(db, levelFilter, cursor));
      setRewards((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === REFERRAL_REWARDS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more referral reward logs. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    rewards,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
