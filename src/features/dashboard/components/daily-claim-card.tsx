"use client";

import { useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useDailyClaimStatus } from "@/features/earnings/hooks/use-daily-claim-status";
import { runAutomaticDailyEarning } from "@/features/earnings/lib/actions";
import type { UserDoc } from "@/lib/firestore/users";

type DailyClaimCardProps = {
  profile: UserDoc;
};

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function DailyClaimCard({ profile }: DailyClaimCardProps) {
  const { user } = useAuth();
  const { canClaim, remainingMs, dailyEarning, blockedReason, loading } =
    useDailyClaimStatus(profile);

  const [creditedAmount, setCreditedAmount] = useState<number | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);
  const attemptedForRef = useRef<string | null>(null);

  // Fully automatic, no button: the moment this user's 24h window opens,
  // silently credit their Coca-Cola Earning wallet. Keyed off
  // lastDailyClaimAt so it only ever attempts once per window even if this
  // component re-renders many times before Firestore's own listener catches
  // up with the new value.
  useEffect(() => {
    if (!user || !canClaim) return;
    const windowKey = profile.lastDailyClaimAt
      ? profile.lastDailyClaimAt.toMillis().toString()
      : "never";
    if (attemptedForRef.current === windowKey) return;
    attemptedForRef.current = windowKey;

    runAutomaticDailyEarning(user.uid)
      .then((amount) => {
        if (amount != null) setCreditedAmount(amount);
      })
      .catch((error) => {
        setCreditError(
          error instanceof Error ? error.message : "Couldn’t credit your daily earning.",
        );
      });
  }, [user, canClaim, profile.lastDailyClaimAt]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Coca-Cola daily earning</h2>
        <Gift className="h-4 w-4 text-brand-light" aria-hidden="true" />
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : blockedReason ? (
        <Alert variant="info">{blockedReason}</Alert>
      ) : (
        <>
          {creditError && <Alert variant="error">{creditError}</Alert>}
          {creditedAmount != null && (
            <Alert variant="success">
              {formatCurrency(creditedAmount)} was automatically credited to your Coca-Cola Earning
              wallet!
            </Alert>
          )}

          {canClaim ? (
            <>
              <p className="text-sm text-white/60">Crediting your daily earning…</p>
              <p className="text-sm text-white/40">{formatCurrency(dailyEarning ?? 0)} per day</p>
            </>
          ) : (
            <>
              <p className="text-sm text-white/60">Next automatic credit in</p>
              <p className="text-3xl font-bold tabular-nums text-white">
                {formatCountdown(remainingMs)}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function DailyClaimCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
