"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allCmsMediaQuery, type CmsMediaDoc } from "@/lib/firestore/cms-media";

type UseAdminCmsMediaResult = {
  media: CmsMediaDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsMedia(): UseAdminCmsMediaResult {
  const canFetch = Boolean(db);

  const [media, setMedia] = useState<CmsMediaDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allCmsMediaQuery(db),
      (snapshot) => {
        setMedia(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load media. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { media, loading: canFetch ? loading : false, error, retry };
}
