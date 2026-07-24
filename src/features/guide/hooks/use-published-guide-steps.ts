"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getPublishedGuideSteps, type CmsGuideCategory, type CmsGuideStepDoc } from "@/lib/firestore/cms-guides";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UsePublishedGuideStepsResult = {
  steps: CmsGuideStepDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function usePublishedGuideSteps(category: CmsGuideCategory): UsePublishedGuideStepsResult {
  const canFetch = Boolean(db);
  const [steps, setSteps] = useState<CmsGuideStepDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${category}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    let cancelled = false;
    getPublishedGuideSteps(db, category)
      .then((result) => {
        if (cancelled) return;
        setSteps(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load this guide. Please try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canFetch, category, attempt]);

  const retry = () => setAttempt((count) => count + 1);
  return { steps, loading: canFetch ? loading : false, error, retry };
}
