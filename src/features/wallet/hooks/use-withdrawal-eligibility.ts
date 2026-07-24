"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getWithdrawalRules } from "@/lib/firestore/settings";
import { getDirectActiveReferralCount } from "@/lib/firestore/team-members";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";
import {
  DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW,
  DEFAULT_COCA_COLA_REQUIRED_LEVEL,
} from "@/features/wallet/lib/validation";

type UseWithdrawalEligibilityResult = {
  currentBalanceMinWithdraw: number;
  cocaColaRequiredLevel: number;
  directActiveReferrals: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Advisory only, purely for UI display — the authoritative Level check
// happens server-side in approveWithdrawal via a live re-fetch (Firestore
// rules can't run the aggregate count query this needs). Absence of
// settings/withdrawalRules falls back to the platform defaults.
export function useWithdrawalEligibility(uid: string | null): UseWithdrawalEligibilityResult {
  const canFetch = Boolean(db && uid);

  const [currentBalanceMinWithdraw, setCurrentBalanceMinWithdraw] = useState(
    DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW,
  );
  const [cocaColaRequiredLevel, setCocaColaRequiredLevel] = useState(DEFAULT_COCA_COLA_REQUIRED_LEVEL);
  const [directActiveReferrals, setDirectActiveReferrals] = useState(0);
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
    const firestore = db;

    let cancelled = false;
    Promise.all([getWithdrawalRules(firestore), getDirectActiveReferralCount(firestore, uid)])
      .then(([rules, count]) => {
        if (cancelled) return;
        setCurrentBalanceMinWithdraw(rules?.currentBalanceMinWithdraw ?? DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW);
        setCocaColaRequiredLevel(rules?.cocaColaRequiredLevel ?? DEFAULT_COCA_COLA_REQUIRED_LEVEL);
        setDirectActiveReferrals(count);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load withdrawal eligibility. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return {
    currentBalanceMinWithdraw,
    cocaColaRequiredLevel,
    directActiveReferrals,
    loading: canFetch ? loading : false,
    error,
    retry,
  };
}
