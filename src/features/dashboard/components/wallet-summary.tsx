"use client";

import type { UserDoc } from "@/lib/firestore/users";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useWithdrawalTotals } from "@/features/wallet/hooks/use-withdrawal-totals";

type WalletSummaryProps = {
  profile: UserDoc;
};

function Card({ label, value, loading, error, retry }: { label: string; value?: number; loading?: boolean; error?: string | null; retry?: () => void }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
      {loading ? (
        <Skeleton className="h-6 w-20" />
      ) : error ? (
        <button
          type="button"
          onClick={retry}
          className="text-left text-xs text-red-400 underline decoration-dotted underline-offset-2"
        >
          Retry
        </button>
      ) : (
        <p className="text-xl font-bold text-white sm:text-2xl">{formatCurrency(value ?? 0)}</p>
      )}
    </div>
  );
}

// Five tiles only — Current Balance, Coca-Cola Earning, and the three
// Withdraw totals. Staff Earning is deliberately NOT a wallet tile here: it
// is a reporting/history category, not a spendable balance, and lives on
// the Staff Earning page instead (see /team). The three Withdraw tiles are
// a live sum of this user's own withdrawal requests in each status. No
// standalone "Deposit Wallet" tile — that top-up feature has been retired
// entirely (deposits only ever happen as part of a package purchase now).
export function WalletSummary({ profile }: WalletSummaryProps) {
  const { totals: withdrawalTotals, loading: withdrawalLoading, error: withdrawalError, retry: retryWithdrawals } = useWithdrawalTotals();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <Card label="Current Balance" value={profile.currentBalance} />
      <Card label="Coca-Cola Earning" value={profile.cocaColaEarning} />
      <Card label="Approved Withdraw" value={withdrawalTotals?.approved} loading={withdrawalLoading} error={withdrawalError} retry={retryWithdrawals} />
      <Card label="Pending Withdraw" value={withdrawalTotals?.pending} loading={withdrawalLoading} error={withdrawalError} retry={retryWithdrawals} />
      <Card label="Rejected Withdraw" value={withdrawalTotals?.rejected} loading={withdrawalLoading} error={withdrawalError} retry={retryWithdrawals} />
    </div>
  );
}

export function WalletSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
