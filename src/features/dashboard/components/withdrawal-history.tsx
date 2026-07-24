"use client";

import { ArrowUpFromLine } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { WithdrawalStatus } from "@/lib/firestore/withdrawals";
import { useWithdrawalHistory } from "@/features/wallet/hooks/use-withdrawal-history";
import { HistoryCard, HistoryCardSkeleton, HistoryListRow } from "@/features/dashboard/components/history-card";

const STATUS_STYLES: Record<WithdrawalStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export function WithdrawalHistory() {
  const { withdrawals, loading, error, retry } = useWithdrawalHistory();

  return (
    <HistoryCard
      title="Withdrawal history"
      loading={loading}
      error={error}
      retry={retry}
      items={withdrawals}
      emptyMessage="No withdrawal requests yet."
      emptyIcon={ArrowUpFromLine}
      itemKey={(withdrawal, index) => `${withdrawal.accountNumber}-${index}`}
      renderItem={(withdrawal) => (
        <HistoryListRow
          title={withdrawal.accountNumber}
          subtitle={formatDate(withdrawal.createdAt)}
          amount={withdrawal.amount}
          direction="out"
          status={withdrawal.status}
          statusClassName={STATUS_STYLES[withdrawal.status]}
        />
      )}
    />
  );
}

export function WithdrawalHistorySkeleton() {
  return <HistoryCardSkeleton titleWidth="w-40" />;
}
