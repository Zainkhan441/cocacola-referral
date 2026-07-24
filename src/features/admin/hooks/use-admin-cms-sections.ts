"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { cmsSectionsForPageQuery, type CmsSectionDoc } from "@/lib/firestore/cms-sections";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseAdminCmsSectionsResult = {
  sections: CmsSectionDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsSections(pageId: string): UseAdminCmsSectionsResult {
  const canFetch = Boolean(db && pageId);

  const [sections, setSections] = useState<CmsSectionDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${pageId}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      cmsSectionsForPageQuery(db, pageId),
      (snapshot) => {
        setSections(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load sections. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, pageId, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { sections, loading: canFetch ? loading : false, error, retry };
}
