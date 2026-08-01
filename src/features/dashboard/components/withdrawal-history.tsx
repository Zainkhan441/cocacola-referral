"use client";

import { useMemo } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { WithdrawalStatus } from "@/lib/firestore/withdrawals";
import { useWithdrawalHistory } from "@/features/wallet/hooks/use-withdrawal-history";
import { HistoryCard, HistoryCardSkeleton, HistoryListRow } from "@/features/dashboard/components/history-card";

const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

const STATUS_STYLES: Record<WithdrawalStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

// The Dashboard's ONLY transactions-shaped section (replaces the old mixed
// "Recent transactions" feed, which mixed deposits/task rewards/daily
// rewards/referral earnings/admin adjustments in one list) — this shows
// every one of the user's own withdrawal requests, every status included
// (Pending/Approved/Rejected/Paid), nothing else. Reuses the exact same
// live withdrawals subscription the Wallet page's own "Withdraw history"
// card uses (see use-withdrawal-history.ts) — never a second listener
// implementation — but does NOT apply that card's rejected-exclusion,
// since this card is explicitly meant to show every status. No claim,
// reward, wallet-balance, or transaction-creation logic is touched here;
// this only reads and displays existing withdrawals/{id} documents.
export function WithdrawalHistory() {
  const { withdrawals, loading, error, retry } = useWithdrawalHistory();

  // Cheap (at most 10 rows, per recentWithdrawalsQuery's own limit), but
  // memoized anyway so this list isn't rebuilt on re-renders unrelated to
  // the withdrawals data itself.
  const rows = useMemo(
    () =>
      withdrawals.map((withdrawal, index) => ({
        key: `${withdrawal.uid}-${index}-${withdrawal.createdAt?.toMillis?.() ?? index}`,
        withdrawal,
      })),
    [withdrawals],
  );

  return (
    <HistoryCard
      title="Withdrawal history"
      loading={loading}
      error={error}
      retry={retry}
      items={rows}
      emptyMessage="No withdrawal history yet."
      emptyIcon={ArrowUpFromLine}
      itemKey={(row) => row.key}
      renderItem={({ withdrawal }) => (
        <HistoryListRow
          title={
            withdrawal.accountNumber ? `Withdrawal to ${withdrawal.accountNumber}` : "Withdrawal"
          }
          subtitle={formatDateTime(withdrawal.createdAt)}
          amount={withdrawal.amount}
          direction="out"
          status={STATUS_LABELS[withdrawal.status]}
          statusClassName={STATUS_STYLES[withdrawal.status]}
        />
      )}
    />
  );
}

export function WithdrawalHistorySkeleton() {
  return <HistoryCardSkeleton titleWidth="w-40" />;
}
