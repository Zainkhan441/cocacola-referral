"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getTaskRewardSettings, type TaskRewardSettingsDoc } from "@/lib/firestore/settings";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseTaskRewardSettingsResult = {
  settings: TaskRewardSettingsDoc | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useTaskRewardSettings(): UseTaskRewardSettingsResult {
  const canFetch = Boolean(db);

  const [settings, setSettings] = useState<TaskRewardSettingsDoc | null>(null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;
    getTaskRewardSettings(firestore)
      .then((result) => {
        if (cancelled) return;
        setSettings(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load task reward settings. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { settings, loading: canFetch ? loading : false, error, retry };
}
