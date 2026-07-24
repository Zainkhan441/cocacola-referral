"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { recentDepositsQuery, type DepositDoc } from "@/lib/firestore/deposits";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseDepositHistoryResult = {
  deposits: DepositDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useDepositHistory(): UseDepositHistoryResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [deposits, setDeposits] = useState<DepositDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${uid}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db || !uid) return;

    const unsubscribe = onSnapshot(
      recentDepositsQuery(db, uid),
      (snapshot) => {
        setDeposits(snapshot.docs.map((doc) => doc.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load your deposit history. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { deposits, loading: canFetch ? loading : false, error, retry };
}
