"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  getTeamTotalCount,
  getTeamActiveCount,
  getTeamLevelCounts,
} from "@/lib/firestore/team-members";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type TeamSummary = {
  total: number;
  active: number;
  levelCounts: Record<number, number>;
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
    ])
      .then(([total, active, levelCounts]) => {
        if (cancelled) return;
        setSummary({ total, active, levelCounts });
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
