"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allCmsFaqQuery, type CmsFaqItemDoc } from "@/lib/firestore/cms-faq";

type UseAdminCmsFaqResult = {
  faqItems: CmsFaqItemDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsFaq(): UseAdminCmsFaqResult {
  const canFetch = Boolean(db);

  const [faqItems, setFaqItems] = useState<CmsFaqItemDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allCmsFaqQuery(db),
      (snapshot) => {
        setFaqItems(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load FAQ items. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { faqItems, loading: canFetch ? loading : false, error, retry };
}
