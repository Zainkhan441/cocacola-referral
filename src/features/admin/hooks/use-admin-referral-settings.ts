"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  getAllReferralLevelSettings,
  DEFAULT_REFERRAL_LEVEL_RATES,
  REFERRAL_LEVELS,
  type RewardType,
} from "@/lib/firestore/referral-settings";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type LevelSettingRow = {
  level: number;
  rewardType: RewardType;
  rewardValue: number;
  enabled: boolean;
  // True when this level has no document in Firestore yet — the row shows
  // the seed default, not yet a real saved value, until the admin hits Save.
  isDefault: boolean;
};

type UseAdminReferralSettingsResult = {
  rows: LevelSettingRow[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminReferralSettings(): UseAdminReferralSettingsResult {
  const canFetch = Boolean(db);

  const [rows, setRows] = useState<LevelSettingRow[]>([]);
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

    getAllReferralLevelSettings(firestore)
      .then((settings) => {
        if (cancelled) return;
        const byLevel = new Map(settings.map((setting) => [setting.level, setting]));
        const merged: LevelSettingRow[] = Array.from({ length: REFERRAL_LEVELS }, (_, index) => {
          const level = index + 1;
          const existing = byLevel.get(level);
          if (existing) {
            return {
              level,
              rewardType: existing.rewardType,
              rewardValue: existing.rewardValue,
              enabled: existing.enabled,
              isDefault: false,
            };
          }
          return {
            level,
            rewardType: "percentage" as const,
            rewardValue: DEFAULT_REFERRAL_LEVEL_RATES[level],
            enabled: true,
            isDefault: true,
          };
        });
        setRows(merged);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load referral level settings. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { rows, loading: canFetch ? loading : false, error, retry };
}
