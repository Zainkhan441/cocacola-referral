"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  cmsGuideStepsForCategoryQuery,
  type CmsGuideCategory,
  type CmsGuideStepDoc,
} from "@/lib/firestore/cms-guides";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseAdminCmsGuideStepsResult = {
  steps: CmsGuideStepDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsGuideSteps(category: CmsGuideCategory): UseAdminCmsGuideStepsResult {
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

    const unsubscribe = onSnapshot(
      cmsGuideStepsForCategoryQuery(db, category),
      (snapshot) => {
        setSteps(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load guide steps. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, category, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { steps, loading: canFetch ? loading : false, error, retry };
}
