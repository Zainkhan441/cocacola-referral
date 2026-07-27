"use client";

import { useEffect, useState } from "react";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { useGlobalSettings } from "@/features/earnings/hooks/use-global-settings";
import { startOfNextUtcDay } from "@/lib/date-utils";
import type { UserDoc } from "@/lib/firestore/users";

type UseDailyClaimStatusResult = {
  canClaim: boolean;
  remainingMs: number;
  dailyEarning: number | null;
  blockedReason: string | null;
  loading: boolean;
};

// The countdown is a real, live-ticking computation against the caller's
// actual lastDailyClaimAt (from Firestore) and the next UTC midnight after
// it — not a fabricated timer, and not a fixed 24h window. It reflects
// exactly the same UTC calendar-day gate firestore.rules enforces
// server-side (see canClaimDaily/isNewUtcDay).
export function useDailyClaimStatus(profile: UserDoc | null): UseDailyClaimStatusResult {
  const { packageInfo, loading: packageLoading } = usePackageLimits(profile?.package ?? null);
  const { settings, loading: settingsLoading } = useGlobalSettings();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastClaimMs = profile?.lastDailyClaimAt ? profile.lastDailyClaimAt.toMillis() : null;
  const nextClaimAtMs = lastClaimMs != null ? startOfNextUtcDay(lastClaimMs) : null;
  const cooldownActive = nextClaimAtMs != null && now < nextClaimAtMs;
  const remainingMs = cooldownActive ? nextClaimAtMs! - now : 0;

  const globalEnabled = settings ? settings.dailyClaimsEnabled : true;

  let blockedReason: string | null = null;
  if (!profile?.package) {
    blockedReason = "You need an active package to claim daily earnings.";
  } else if (!globalEnabled) {
    blockedReason = "Daily claims are temporarily paused platform-wide.";
  } else if (packageInfo && !packageInfo.isActive) {
    blockedReason = "Your package's daily claims are currently paused.";
  }

  const canClaim = Boolean(
    profile?.package &&
      globalEnabled &&
      packageInfo?.isActive &&
      !cooldownActive,
  );

  return {
    canClaim,
    remainingMs,
    dailyEarning: packageInfo?.dailyEarning ?? null,
    blockedReason,
    loading: packageLoading || settingsLoading,
  };
}
