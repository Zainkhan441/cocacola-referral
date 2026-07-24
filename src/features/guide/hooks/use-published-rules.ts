"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getPublishedRules } from "@/lib/firestore/cms-rules";
import type { CmsRuleDoc } from "@/lib/firestore/cms-rules";

type UsePublishedRulesResult = {
  rules: CmsRuleDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function usePublishedRules(): UsePublishedRulesResult {
  const canFetch = Boolean(db);
  const [rules, setRules] = useState<CmsRuleDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;
    let cancelled = false;
    getPublishedRules(db)
      .then((result) => {
        if (cancelled) return;
        setRules(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load the rules. Please try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);
  return { rules, loading: canFetch ? loading : false, error, retry };
}
