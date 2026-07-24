"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  adminTaskSubmissionsPageQuery,
  TASK_SUBMISSIONS_PAGE_SIZE,
  type TaskSubmissionDoc,
  type TaskSubmissionStatusFilter,
} from "@/lib/firestore/task-submissions";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type TaskSubmissionWithId = TaskSubmissionDoc & { id: string };

type UseAdminTaskSubmissionsResult = {
  submissions: TaskSubmissionWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useAdminTaskSubmissions(
  statusFilter: TaskSubmissionStatusFilter,
): UseAdminTaskSubmissionsResult {
  const canFetch = Boolean(db);

  const [submissions, setSubmissions] = useState<TaskSubmissionWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<TaskSubmissionDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${statusFilter}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setSubmissions([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    getDocs(adminTaskSubmissionsPageQuery(firestore, statusFilter, null))
      .then((snapshot) => {
        if (cancelled) return;
        setSubmissions(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === TASK_SUBMISSIONS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load task submissions. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, statusFilter, attempt]);

  async function loadMore() {
    if (!db || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(adminTaskSubmissionsPageQuery(db, statusFilter, cursor));
      setSubmissions((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === TASK_SUBMISSIONS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more task submissions. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    submissions,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
