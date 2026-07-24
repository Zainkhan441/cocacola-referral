"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getOfficialChannel, type OfficialChannelDoc } from "@/lib/firestore/settings";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseOfficialChannelResult = {
  channel: OfficialChannelDoc | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useOfficialChannel(): UseOfficialChannelResult {
  const canFetch = Boolean(db);

  const [channel, setChannel] = useState<OfficialChannelDoc | null>(null);
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
    getOfficialChannel(firestore)
      .then((result) => {
        if (cancelled) return;
        setChannel(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load the official channel. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { channel, loading: canFetch ? loading : false, error, retry };
}
