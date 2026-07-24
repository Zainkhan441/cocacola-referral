"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getPublishedLinksForPlacement, type CmsLinkDoc, type CmsLinkPlacement } from "@/lib/firestore/cms-links";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UsePublishedLinksResult = {
  links: CmsLinkDoc[];
  loading: boolean;
};

// No error/retry surfaced here deliberately — nav/footer links are
// decorative-navigational, not critical content; a transient failure just
// means that link group renders empty rather than blocking the page.
export function usePublishedLinks(placement: CmsLinkPlacement): UsePublishedLinksResult {
  const canFetch = Boolean(db);
  const [links, setLinks] = useState<CmsLinkDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [attempt] = useState(0);

  const fetchKey = canFetch ? `${placement}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    let cancelled = false;
    getPublishedLinksForPlacement(db, placement)
      .then((result) => {
        if (cancelled) return;
        setLinks(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canFetch, placement]);

  return { links, loading: canFetch ? loading : false };
}
