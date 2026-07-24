"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  recentReferralRewardsQuery,
  type ReferralRewardDoc,
} from "@/lib/firestore/referral-rewards";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseReferralActivityResult = {
  rewards: ReferralRewardDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useReferralActivity(): UseReferralActivityResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [rewards, setRewards] = useState<ReferralRewardDoc[]>([]);
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
      recentReferralRewardsQuery(db, uid),
      (snapshot) => {
        setRewards(snapshot.docs.map((doc) => doc.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load your referral activity. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { rewards, loading: canFetch ? loading : false, error, retry };
}
