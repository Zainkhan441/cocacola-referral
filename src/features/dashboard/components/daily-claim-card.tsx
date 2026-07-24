"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useDailyClaimStatus } from "@/features/earnings/hooks/use-daily-claim-status";
import { claimDailyEarning } from "@/features/earnings/lib/actions";
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

  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);

  async function handleClaim() {
    if (!user || claiming || !canClaim) return;
    setClaiming(true);
    setClaimError(null);
    setClaimedAmount(null);
    try {
      const amount = await claimDailyEarning(user.uid);
      setClaimedAmount(amount);
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : "Couldn’t claim your daily earning.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Daily earning</h2>
        <Gift className="h-4 w-4 text-brand-light" aria-hidden="true" />
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : blockedReason ? (
        <Alert variant="info">{blockedReason}</Alert>
      ) : (
        <>
          {claimError && <Alert variant="error">{claimError}</Alert>}
          {claimedAmount != null && (
            <Alert variant="success">
              Claimed {formatCurrency(claimedAmount)}! Come back tomorrow.
            </Alert>
          )}

          {canClaim ? (
            <>
              <p className="text-sm text-white/60">
                You can claim {formatCurrency(dailyEarning ?? 0)} right now.
              </p>
              <Button size="lg" disabled={claiming} onClick={handleClaim}>
                {claiming ? <Spinner /> : `Claim ${formatCurrency(dailyEarning ?? 0)}`}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-white/60">Next claim available in</p>
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
