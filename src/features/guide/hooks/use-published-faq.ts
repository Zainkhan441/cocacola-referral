"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getPublishedFaqItems } from "@/lib/firestore/cms-faq";
import type { CmsFaqItemDoc } from "@/lib/firestore/cms-faq";

type UsePublishedFaqResult = {
  items: CmsFaqItemDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function usePublishedFaq(): UsePublishedFaqResult {
  const canFetch = Boolean(db);
  const [items, setItems] = useState<CmsFaqItemDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;
    let cancelled = false;
    getPublishedFaqItems(db)
      .then((result) => {
        if (cancelled) return;
        setItems(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load the FAQ. Please try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);
  return { items, loading: canFetch ? loading : false, error, retry };
}
