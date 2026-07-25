"use client";

import { Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useWithdrawalEligibility } from "@/features/wallet/hooks/use-withdrawal-eligibility";

// Surfaces the "Level" rule that already gates Coca-Cola Earning withdrawals
// (Level N = N direct active referrals, admin-editable required Level —
// see settings/withdrawalRules) as a first-class, visible progression
// display, reusing useWithdrawalEligibility's existing live data rather than
// introducing any new counting logic. Deliberately titled "Your Level" and
// always paired with "direct active referrals" so it's never confused with
// the unrelated Level 1–12 referral-depth breakdown shown elsewhere on this
// page (that "Level" means how deep in the 12-tier network a member sits;
// this "Level" means how many of your own direct referrals are active).
export function LevelProgressCard() {
  const { user } = useAuth();
  const { cocaColaRequiredLevel, directActiveReferrals, loading, error, retry } =
    useWithdrawalEligibility(user?.uid ?? null);

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

  const met = directActiveReferrals >= cocaColaRequiredLevel;
  const progressPercent = Math.min(
    100,
    Math.round((directActiveReferrals / Math.max(cocaColaRequiredLevel, 1)) * 100),
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-brand-light" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Your Level</h2>
        </div>
        <p className="text-2xl font-bold text-white">{directActiveReferrals}</p>
      </div>

      <p className="text-xs text-white/50">
        Your Level is your number of direct active referrals — separate from the 12-tier
        network breakdown below.
      </p>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-white/60">
          {met ? (
            <>
              Level {cocaColaRequiredLevel} reached — Coca-Cola Earning withdrawals are
              unlocked.
            </>
          ) : (
            <>
              {directActiveReferrals} of {cocaColaRequiredLevel} direct active referrals —
              reach Level {cocaColaRequiredLevel} to unlock Coca-Cola Earning withdrawals.
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
