"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allCmsRulesQuery, type CmsRuleDoc } from "@/lib/firestore/cms-rules";

type UseAdminCmsRulesResult = {
  rules: CmsRuleDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsRules(): UseAdminCmsRulesResult {
  const canFetch = Boolean(db);

  const [rules, setRules] = useState<CmsRuleDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allCmsRulesQuery(db),
      (snapshot) => {
        setRules(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load rules. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { rules, loading: canFetch ? loading : false, error, retry };
}
