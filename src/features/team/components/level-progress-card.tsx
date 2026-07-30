"use client";

import { Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useWithdrawalEligibility } from "@/features/wallet/hooks/use-withdrawal-eligibility";
import { calculateLevel, levelLabel } from "@/lib/level";

// Two distinct, deliberately-labeled numbers on this card: the CocaCola
// Level System's own Level (1-12, computed via the one shared
// calculateLevel() utility — the same "Level" shown on the Staff Earning
// summary cards, Bonus page, and admin user details), and the separate
// admin-selected required Level that gates Coca-Cola Earning withdrawals
// (settings/withdrawalRules.cocaColaRequiredLevel — a Level NUMBER 1-12, or
// null/disabled). The withdrawal-unlock progress below is measured against
// that required Level's REAL threshold (cocaColaRequiredThreshold, resolved
// via thresholdForLevel()), never against the Level number itself — Level 11
// needs 732 active direct referrals, not 11.
export function LevelProgressCard() {
  const { user } = useAuth();
  const { cocaColaRequiredLevel, cocaColaRequiredThreshold, directActiveReferrals, loading, error, retry } =
    useWithdrawalEligibility(user?.uid ?? null);
  const levelResult = calculateLevel(directActiveReferrals);

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  const withdrawalDisabled = cocaColaRequiredLevel == null || cocaColaRequiredThreshold == null;
  const met = !withdrawalDisabled && directActiveReferrals >= cocaColaRequiredThreshold;
  const withdrawUnlockPercent = withdrawalDisabled
    ? 0
    : Math.min(100, Math.round((directActiveReferrals / Math.max(cocaColaRequiredThreshold, 1)) * 100));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-brand-light" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Your Level</h2>
        </div>
        <p className="text-2xl font-bold text-white">
          {levelResult.level != null ? levelLabel(levelResult.level) : "No Level"}
        </p>
      </div>

      <p className="text-xs text-white/50">
        {directActiveReferrals} active direct referral{directActiveReferrals === 1 ? "" : "s"}
        {levelResult.nextLevel != null && (
          <> — {levelResult.referralsNeeded} more to reach {levelLabel(levelResult.nextLevel)}</>
        )}
      </p>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${levelResult.progressPercent}%` }}
          />
        </div>
        {levelResult.nextLevel != null ? (
          <p className="text-xs text-white/40">
            {directActiveReferrals} of {levelResult.nextThreshold} active direct referrals toward{" "}
            {levelLabel(levelResult.nextLevel)}
          </p>
        ) : (
          <p className="text-xs text-white/40">Maximum level reached.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
        <p className="text-xs font-medium text-white/70">Coca-Cola Earning withdrawal unlock</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${withdrawUnlockPercent}%` }}
          />
        </div>
        <p className="text-xs text-white/60">
          {withdrawalDisabled ? (
            <>Coca-Cola Earning withdrawals are currently disabled.</>
          ) : met ? (
            <>{levelLabel(cocaColaRequiredLevel)} reached — Coca-Cola Earning withdrawals are unlocked.</>
          ) : (
            <>
              {directActiveReferrals} of {cocaColaRequiredThreshold} active direct referrals needed to
              reach {levelLabel(cocaColaRequiredLevel)} and unlock Coca-Cola Earning withdrawals.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function LevelProgressCardSkeleton() {
  return <Skeleton className="h-40 w-full rounded-2xl" />;
}
