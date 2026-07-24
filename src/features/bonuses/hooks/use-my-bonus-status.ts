"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getMyBonusAwardedTierIds } from "@/lib/firestore/bonus-awards";
import { getMyPendingClaimForTier } from "@/lib/firestore/bonus-claims";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseMyBonusStatusResult = {
  awardedTierIds: Set<string>;
  pendingTierIds: Set<string>;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// For each visible tier, the Bonuses page needs to know: has this one-time
// tier already been paid (awardedTierIds), and is there already a claim
// awaiting review for this tier (pendingTierIds) — both gate the "Claim"
// button. tierIds is the current list of tier ids to check pending-status
// for; awarded-status is checked across ALL of the user's tiers at once
// (a single cheap equality-filter query).
export function useMyBonusStatus(tierIds: string[]): UseMyBonusStatusResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [awardedTierIds, setAwardedTierIds] = useState<Set<string>>(new Set());
  const [pendingTierIds, setPendingTierIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const tierIdsKey = tierIds.join(",");
  const fetchKey = canFetch ? `${uid}:${tierIdsKey}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db || !uid) return;
    const firestore = db;

    let cancelled = false;
    Promise.all([
      getMyBonusAwardedTierIds(firestore, uid),
      Promise.all(
        tierIdsKey
          .split(",")
          .filter(Boolean)
          .map(async (tierId) => [tierId, await getMyPendingClaimForTier(firestore, uid, tierId)] as const),
      ),
    ])
      .then(([awarded, pendingPairs]) => {
        if (cancelled) return;
        setAwardedTierIds(awarded);
        setPendingTierIds(new Set(pendingPairs.filter(([, pending]) => pending).map(([tierId]) => tierId)));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your bonus status. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, tierIdsKey, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { awardedTierIds, pendingTierIds, loading: canFetch ? loading : false, error, retry };
}
