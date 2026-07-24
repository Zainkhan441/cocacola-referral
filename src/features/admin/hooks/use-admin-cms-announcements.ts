"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allCmsAnnouncementsQuery, type CmsAnnouncementDoc } from "@/lib/firestore/cms-announcements";

type UseAdminCmsAnnouncementsResult = {
  announcements: CmsAnnouncementDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminCmsAnnouncements(): UseAdminCmsAnnouncementsResult {
  const canFetch = Boolean(db);

  const [announcements, setAnnouncements] = useState<CmsAnnouncementDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allCmsAnnouncementsQuery(db),
      (snapshot) => {
        setAnnouncements(snapshot.docs.map((docSnap) => docSnap.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load announcements. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { announcements, loading: canFetch ? loading : false, error, retry };
}
