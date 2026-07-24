"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getPublishedAnnouncements, type CmsAnnouncementDoc } from "@/lib/firestore/cms-announcements";

type UsePublishedAnnouncementsResult = {
  announcements: CmsAnnouncementDoc[];
  loading: boolean;
};

// The start/end date window (if set) is evaluated here, client-side, after
// fetch — Firestore can't filter "now is between two different fields" in
// one query (see the note in cms-sections.ts).
export function usePublishedAnnouncements(): UsePublishedAnnouncementsResult {
  const canFetch = Boolean(db);
  const [announcements, setAnnouncements] = useState<CmsAnnouncementDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);

  useEffect(() => {
    if (!canFetch || !db) return;
    let cancelled = false;
    getPublishedAnnouncements(db)
      .then((result) => {
        if (cancelled) return;
        const now = Date.now();
        const active = result.filter((item) => {
          if (item.startDate && now < item.startDate.toMillis()) return false;
          if (item.endDate && now > item.endDate.toMillis()) return false;
          return true;
        });
        setAnnouncements(active);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canFetch]);

  return { announcements, loading: canFetch ? loading : false };
}
