"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useDirectReferralCounts } from "@/features/user/hooks/use-direct-referral-counts";
import { useReferralEarnings } from "@/features/user/hooks/use-referral-earnings";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
    </div>
  );
}

// The Staff Earning section's headline numbers — all direct-referral-only
// (never the 12-level network total shown by TeamSummaryCards further down
// this page), computed live rather than from any stored counter.
export function StaffEarningSummaryCards() {
  const { counts, loading: countsLoading, error: countsError, retry: retryCounts } = useDirectReferralCounts();
  const { total: earnings, loading: earningsLoading, error: earningsError, retry: retryEarnings } =
    useReferralEarnings();

  const loading = countsLoading || earningsLoading;
  const error = countsError || earningsError;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Total direct referrals" value={(counts?.total ?? 0).toLocaleString()} />
      <StatCard label="Active direct referrals" value={(counts?.active ?? 0).toLocaleString()} />
      <StatCard label="Inactive / pending" value={(counts?.pending ?? 0).toLocaleString()} />
      <StatCard label="Total referral earnings" value={formatCurrency(earnings ?? 0)} />
    </div>
  );
}
