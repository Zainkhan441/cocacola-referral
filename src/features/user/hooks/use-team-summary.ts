"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  getTeamTotalCount,
  getTeamActiveCount,
  getTeamLevelCounts,
  getDirectActiveReferralCount,
} from "@/lib/firestore/team-members";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type TeamSummary = {
  total: number;
  active: number;
  levelCounts: Record<number, number>;
  // Direct (level 1) referrals who currently hold a package — distinct
  // from levelCounts[1], which counts every level-1 registration
  // regardless of package status. The 12-level CocaCola Level System and
  // all bonus/Level eligibility must use this field, never levelCounts[1],
  // so a claim/level can't be satisfied by referrals who signed up but
  // never activated (see level.ts, bonus-tier-card.tsx,
  // bonuses/lib/actions.ts).
  directActive: number;
};

type UseTeamSummaryResult = {
  summary: TeamSummary | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useTeamSummary(): UseTeamSummaryResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [summary, setSummary] = useState<TeamSummary | null>(null);
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
    const firestore = db;

    let cancelled = false;
    Promise.all([
      getTeamTotalCount(firestore, uid),
      getTeamActiveCount(firestore, uid),
      getTeamLevelCounts(firestore, uid),
      getDirectActiveReferralCount(firestore, uid),
    ])
      .then(([total, active, levelCounts, directActive]) => {
        if (cancelled) return;
        setSummary({ total, active, levelCounts, directActive });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your team summary. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { summary, loading: canFetch ? loading : false, error, retry };
}
