"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allTasksQuery, type TaskDoc } from "@/lib/firestore/tasks";

type UseAdminTasksResult = {
  tasks: TaskDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminTasks(): UseAdminTasksResult {
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
