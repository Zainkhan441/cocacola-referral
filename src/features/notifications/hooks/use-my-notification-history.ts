"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  myNotificationsPageQuery,
  USER_NOTIFICATIONS_PAGE_SIZE,
  type UserNotificationDoc,
} from "@/lib/firestore/user-notifications";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";
import { toVisibleSanitizedNotifications } from "@/features/notifications/lib/withdrawal-notification-display";

export type UserNotificationWithId = UserNotificationDoc & { id: string };

type UseMyNotificationHistoryResult = {
  notifications: UserNotificationWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

// The complete, paginated notification history page (distinct from the
// bell's real-time last-20 feed).
export function useMyNotificationHistory(): UseMyNotificationHistoryResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [notifications, setNotifications] = useState<UserNotificationWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<UserNotificationDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${uid}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setNotifications([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db || !uid) return;
    const firestore = db;

    let cancelled = false;
    getDocs(myNotificationsPageQuery(firestore, uid, null))
      .then((snapshot) => {
        if (cancelled) return;
        const raw = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        // Withdrawal-only, privacy-sanitized — see
        // withdrawal-notification-display.ts. Pagination (cursor/hasMore)
        // is still driven by the RAW page (whether Firestore actually
        // returned a full page), not the filtered count — otherwise a page
        // full of non-withdrawal notifications would look like "no more
        // history" even though more genuinely exists beyond the cursor.
        setNotifications(toVisibleSanitizedNotifications(raw));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === USER_NOTIFICATIONS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your notification history. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, attempt]);

  async function loadMore() {
    if (!db || !uid || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(myNotificationsPageQuery(db, uid, cursor));
      const raw = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setNotifications((prev) => [...prev, ...toVisibleSanitizedNotifications(raw)]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === USER_NOTIFICATIONS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more of your notification history. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    notifications,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
