"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { myNotificationsFeedQuery, type UserNotificationDoc } from "@/lib/firestore/user-notifications";
import { useAuth } from "@/features/auth/context/auth-provider";

export type UserNotificationWithId = UserNotificationDoc & { id: string };

type UseMyNotificationsResult = {
  notifications: UserNotificationWithId[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Real-time feed (most recent 20) for the notification bell — a live
// onSnapshot listener, so a newly sent broadcast appears instantly for any
// currently-online recipient without a refresh (Milestone 13 requirement 5).
export function useMyNotifications(): UseMyNotificationsResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [notifications, setNotifications] = useState<UserNotificationWithId[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db || !uid) return;

    const unsubscribe = onSnapshot(
      myNotificationsFeedQuery(db, uid),
      (snapshot) => {
        setNotifications(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load your notifications. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { notifications, loading: canFetch ? loading : false, error, retry };
}
