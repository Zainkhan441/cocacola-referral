"use client";

import { useEffect, useState } from "react";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { useGlobalSettings } from "@/features/earnings/hooks/use-global-settings";
import type { UserDoc } from "@/lib/firestore/users";

const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type UseDailyClaimStatusResult = {
  canClaim: boolean;
  remainingMs: number;
  dailyEarning: number | null;
  blockedReason: string | null;
  loading: boolean;
};

// The countdown is a real, live-ticking computation against the caller's
// actual lastDailyClaimAt (from Firestore) plus a fixed 24h cooldown — not
// a fabricated timer. It reflects exactly the same window
// firestore.rules enforces server-side (see canClaimDaily).
export function useDailyClaimStatus(profile: UserDoc | null): UseDailyClaimStatusResult {
  const { packageInfo, loading: packageLoading } = usePackageLimits(profile?.package ?? null);
  const { settings, loading: settingsLoading } = useGlobalSettings();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastClaimMs = profile?.lastDailyClaimAt ? profile.lastDailyClaimAt.toMillis() : null;
  const nextClaimAtMs = lastClaimMs != null ? lastClaimMs + CLAIM_COOLDOWN_MS : null;
  const cooldownActive = nextClaimAtMs != null && now < nextClaimAtMs;
  const remainingMs = cooldownActive ? nextClaimAtMs! - now : 0;

  const globalEnabled = settings ? settings.dailyClaimsEnabled : true;
  const packageExpired = profile?.package
    ? !profile.packageExpiresAt || now >= profile.packageExpiresAt.toMillis()
    : false;

  let blockedReason: string | null = null;
  if (!profile?.package) {
    blockedReason = "You need an active package to claim daily earnings.";
  } else if (packageExpired) {
    blockedReason = "Your package has expired. Renew it to keep claiming.";
  } else if (!globalEnabled) {
    blockedReason = "Daily claims are temporarily paused platform-wide.";
  } else if (packageInfo && !packageInfo.isActive) {
    blockedReason = "Your package's daily claims are currently paused.";
  }

  const canClaim = Boolean(
    profile?.package &&
      !packageExpired &&
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
