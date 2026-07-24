"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  activityLogsPageQuery,
  ACTIVITY_LOGS_PAGE_SIZE,
  type ActivityLogDoc,
} from "@/lib/firestore/activity-logs";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseAdminActivityLogsResult = {
  logs: ActivityLogDoc[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useAdminActivityLogs(): UseAdminActivityLogsResult {
  const canFetch = Boolean(db);

  const [logs, setLogs] = useState<ActivityLogDoc[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<ActivityLogDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setLogs([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    getDocs(activityLogsPageQuery(firestore, null))
      .then((snapshot) => {
        if (cancelled) return;
        setLogs(snapshot.docs.map((doc) => doc.data()));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === ACTIVITY_LOGS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load activity logs. Please try again.");
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
      const snapshot = await getDocs(activityLogsPageQuery(db, cursor));
      setLogs((prev) => [...prev, ...snapshot.docs.map((doc) => doc.data())]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === ACTIVITY_LOGS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more activity logs. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    logs,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
