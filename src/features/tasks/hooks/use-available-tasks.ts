"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allTasksQuery, type TaskDoc } from "@/lib/firestore/tasks";

type UseAvailableTasksResult = {
  tasks: TaskDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Fetches every task (mirroring the admin management list) — filtering down
// to what's actually shown (active, within its date window, eligible for
// the caller's own package) happens in the Tasks page itself, since that
// depends on the viewer's own profile/package, not just the task data.
export function useAvailableTasks(): UseAvailableTasksResult {
  const canFetch = Boolean(db);

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allTasksQuery(db),
      (snapshot) => {
        setTasks(snapshot.docs.map((doc) => doc.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load tasks. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { tasks, loading: canFetch ? loading : false, error, retry };
}
