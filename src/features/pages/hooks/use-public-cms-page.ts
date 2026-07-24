"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getPublishedPageBySlug, getPageBySlugForAdmin } from "@/lib/firestore/cms-pages";
import { getPublishedSectionsForPage, cmsSectionsForPageQuery } from "@/lib/firestore/cms-sections";
import { getDocs } from "firebase/firestore";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";
import type { CmsPageDoc } from "@/lib/firestore/cms-pages";
import type { CmsSectionDoc } from "@/lib/firestore/cms-sections";

type UsePublicCmsPageResult = {
  // undefined = still loading, null = genuinely not found/not published
  page: CmsPageDoc | null | undefined;
  sections: CmsSectionDoc[];
  isDraftPreview: boolean;
  error: string | null;
  retry: () => void;
};

// Resolves a page for public rendering at /p/{slug}. Tries the published
// lookup first (works for every visitor, signed in or not). If nothing
// published matches AND the caller is an admin, falls back to the
// unpublished/admin lookup so an admin can preview a draft before
// publishing — this is what "live preview" means here: the exact same
// renderer, fed real (if unpublished) data, rather than a separate mock.
export function usePublicCmsPage(slug: string, isAdmin: boolean): UsePublicCmsPageResult {
  const canFetch = Boolean(db && slug);
  const [page, setPage] = useState<CmsPageDoc | null | undefined>(undefined);
  const [sections, setSections] = useState<CmsSectionDoc[]>([]);
  const [isDraftPreview, setIsDraftPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${slug}:${isAdmin}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setPage(undefined);
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;
    let cancelled = false;

    async function load() {
      const published = await getPublishedPageBySlug(firestore, slug);
      if (published) {
        const publishedSections = await getPublishedSectionsForPage(firestore, published.id);
        if (cancelled) return;
        setPage(published);
        setSections(publishedSections);
        setIsDraftPreview(false);
        return;
      }

      if (isAdmin) {
        const draft = await getPageBySlugForAdmin(firestore, slug);
        if (draft) {
          const allSections = await getDocs(cmsSectionsForPageQuery(firestore, draft.id));
          if (cancelled) return;
          setPage(draft);
          setSections(allSections.docs.map((docSnap) => docSnap.data()));
          setIsDraftPreview(true);
          return;
        }
      }

      if (!cancelled) setPage(null);
    }

    load().catch(() => {
      if (cancelled) return;
      setError("We couldn’t load this page. Please try again.");
      setPage(null);
    });

    return () => {
      cancelled = true;
    };
  }, [canFetch, slug, isAdmin, attempt]);

  const retry = () => setAttempt((count) => count + 1);
  return { page, sections, isDraftPreview, error, retry };
}
