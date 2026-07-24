"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allBonusTiersQuery, type BonusTierDoc } from "@/lib/firestore/bonus-tiers";

type UseAdminBonusTiersResult = {
  tiers: BonusTierDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminBonusTiers(): UseAdminBonusTiersResult {
  const canFetch = Boolean(db);

  const [tiers, setTiers] = useState<BonusTierDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allBonusTiersQuery(db),
      (snapshot) => {
        setTiers(snapshot.docs.map((doc) => doc.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load bonus tiers. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { tiers, loading: canFetch ? loading : false, error, retry };
}
