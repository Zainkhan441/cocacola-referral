"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userNotificationsCollection } from "@/lib/firestore/user-notifications";
import { useAuth } from "@/features/auth/context/auth-provider";

// A live count (not a one-shot aggregate) so the bell badge updates the
// instant a notification is sent or marked read, on any currently-open tab —
// consistent with the real-time requirement for this feature. Requires the
// (uid asc, read asc) composite index.
export function useUnreadNotificationCount(): number {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!canFetch || !db || !uid) return;

    const unsubscribe = onSnapshot(
      query(userNotificationsCollection(db), where("uid", "==", uid), where("read", "==", false)),
      (snapshot) => setCount(snapshot.size),
      () => setCount(0),
    );

    return unsubscribe;
  }, [canFetch, uid]);

  return canFetch ? count : 0;
}
