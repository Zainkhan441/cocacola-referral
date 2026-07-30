"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { calculateLevel, levelLabel } from "@/lib/level";
import { useDirectReferralCounts } from "@/features/user/hooks/use-direct-referral-counts";
import { useReferralEarnings } from "@/features/user/hooks/use-referral-earnings";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}

// The Staff Earning section's 5 headline numbers (final spec): Total
// Referral Commission, Active Direct Referrals, Total Registered Direct
// Referrals, Current Level, Referrals Needed for Next Level. Level is
// always computed via the one shared calculateLevel() utility from the
// same active-direct-referral count shown here — never a separately
// re-derived number, so this can never disagree with the Bonus page,
// Dashboard, or admin user details.
export function StaffEarningSummaryCards() {
  const { counts, loading: countsLoading, error: countsError, retry: retryCounts } = useDirectReferralCounts();
  const { total: earnings, loading: earningsLoading, error: earningsError, retry: retryEarnings } =
    useReferralEarnings();

  const loading = countsLoading || earningsLoading;
  const error = countsError || earningsError;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            retryCounts();
            retryEarnings();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const activeDirectReferrals = counts?.active ?? 0;
  const level = calculateLevel(activeDirectReferrals);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <StatCard label="Total Referral Commission" value={formatCurrency(earnings ?? 0)} />
      <StatCard label="Active Direct Referrals" value={activeDirectReferrals.toLocaleString()} />
      <StatCard label="Total Registered Direct Referrals" value={(counts?.total ?? 0).toLocaleString()} />
      <StatCard
        label="Current Level"
        value={level.level != null ? levelLabel(level.level) : "No Level"}
      />
      <StatCard
        label="Referrals Needed for Next Level"
        value={level.referralsNeeded != null ? level.referralsNeeded.toLocaleString() : "Max level"}
        hint={level.nextLevel != null ? `to reach ${levelLabel(level.nextLevel)}` : undefined}
      />
    </div>
  );
}
