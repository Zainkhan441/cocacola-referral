"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getWithdrawalRules, type WithdrawalRulesDoc } from "@/lib/firestore/settings";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseWithdrawalRulesResult = {
  rules: WithdrawalRulesDoc | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useWithdrawalRules(): UseWithdrawalRulesResult {
  const canFetch = Boolean(db);

  const [rules, setRules] = useState<WithdrawalRulesDoc | null>(null);
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
    getWithdrawalRules(firestore)
      .then((result) => {
        if (cancelled) return;
        setRules(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load withdrawal rules. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { rules, loading: canFetch ? loading : false, error, retry };
}
