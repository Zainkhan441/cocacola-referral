"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { taskDailyCounterDocRef } from "@/lib/firestore/task-daily-counters";
import { useAuth } from "@/features/auth/context/auth-provider";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

type UseDailyTaskQuotaResult = {
  usedToday: number;
  loading: boolean;
  error: string | null;
};

// Live read of how many tasks (of any kind) this user has submitted within
// the current rolling 24h window — mirrors submitTaskCompletion's own
// "counterIsFresh" check exactly (see features/tasks/lib/actions.ts), so the
// Work Room's progress display always agrees with what the server will
// actually allow. Read-only: never writes taskDailyCounters itself.
export function useDailyTaskQuota(): UseDailyTaskQuotaResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [usedToday, setUsedToday] = useState(0);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canFetch || !db || !uid) return;

    const unsubscribe = onSnapshot(
      taskDailyCounterDocRef(db, uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setUsedToday(0);
        } else {
          const counter = snapshot.data();
          const isFresh = Date.now() - counter.windowStartAt.toMillis() < COOLDOWN_MS;
          setUsedToday(isFresh ? counter.count : 0);
        }
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load today’s task progress. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, uid]);

  return { usedToday, loading: canFetch ? loading : false, error };
}
