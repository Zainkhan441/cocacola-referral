"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allCmsPagesQuery, type CmsPageDoc } from "@/lib/firestore/cms-pages";

type UseAdminCmsPagesResult = {
  pages: CmsPageDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsPages(): UseAdminCmsPagesResult {
  const canFetch = Boolean(db);

  const [pages, setPages] = useState<CmsPageDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allCmsPagesQuery(db),
      (snapshot) => {
        setPages(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load pages. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { pages, loading: canFetch ? loading : false, error, retry };
}
