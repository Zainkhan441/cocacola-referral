"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  announcementsPageQuery,
  ANNOUNCEMENTS_PAGE_SIZE,
  type AnnouncementDoc,
} from "@/lib/firestore/announcements";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type AnnouncementWithId = AnnouncementDoc & { id: string };

type UseAdminAnnouncementsResult = {
  announcements: AnnouncementWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useAdminAnnouncements(): UseAdminAnnouncementsResult {
  const canFetch = Boolean(db);

  const [announcements, setAnnouncements] = useState<AnnouncementWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<AnnouncementDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setAnnouncements([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    getDocs(announcementsPageQuery(firestore, null))
      .then((snapshot) => {
        if (cancelled) return;
        setAnnouncements(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === ANNOUNCEMENTS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load notification history. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  async function loadMore() {
    if (!db || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(announcementsPageQuery(db, cursor));
      setAnnouncements((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === ANNOUNCEMENTS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more notification history. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    announcements,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
