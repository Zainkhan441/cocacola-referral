"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  cmsLinksForPlacementQuery,
  type CmsLinkDoc,
  type CmsLinkPlacement,
} from "@/lib/firestore/cms-links";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseAdminCmsLinksResult = {
  links: CmsLinkDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsLinks(placement: CmsLinkPlacement): UseAdminCmsLinksResult {
  const canFetch = Boolean(db);

  const [links, setLinks] = useState<CmsLinkDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${placement}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      cmsLinksForPlacementQuery(db, placement),
      (snapshot) => {
        setLinks(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load links. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, placement, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { links, loading: canFetch ? loading : false, error, retry };
}
