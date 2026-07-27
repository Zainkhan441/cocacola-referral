"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  getPaymentSettings,
  DEFAULT_PAYMENT_ACCOUNT_TITLE,
  DEFAULT_PAYMENT_ACCOUNT_NUMBER,
  type PaymentSettingsDoc,
} from "@/lib/firestore/settings";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UsePaymentSettingsResult = {
  accountTitle: string;
  accountNumber: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Every payment-related page/modal reads through this one hook, so a saved
// admin change is picked up everywhere on next load with no separate sync
// step. Falls back to the seeded defaults whenever the settings/paymentDetails
// document doesn't exist yet — see lib/firestore/settings.ts.
export function usePaymentSettings(): UsePaymentSettingsResult {
  const canFetch = Boolean(db);

  const [settings, setSettings] = useState<PaymentSettingsDoc | null>(null);
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
    getPaymentSettings(firestore)
      .then((result) => {
        if (cancelled) return;
        setSettings(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn't load payment details. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return {
    accountTitle: settings?.accountTitle ?? DEFAULT_PAYMENT_ACCOUNT_TITLE,
    accountNumber: settings?.accountNumber ?? DEFAULT_PAYMENT_ACCOUNT_NUMBER,
    loading: canFetch ? loading : false,
    error,
    retry,
  };
}
