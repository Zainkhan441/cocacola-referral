"use client";

import { ArrowDownToLine } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { DepositStatus } from "@/lib/firestore/deposits";
import { useDepositHistory } from "@/features/wallet/hooks/use-deposit-history";
import { HistoryCard, HistoryCardSkeleton, HistoryListRow } from "@/features/dashboard/components/history-card";

const STATUS_STYLES: Record<DepositStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function DepositHistory() {
  const { deposits, loading, error, retry } = useDepositHistory();

  return (
    <HistoryCard
      title="Deposit history"
      loading={loading}
      error={error}
      retry={retry}
      items={deposits}
      emptyMessage="No deposit requests yet."
      emptyIcon={ArrowDownToLine}
      itemKey={(deposit, index) => `${deposit.referenceId}-${index}`}
      renderItem={(deposit) => (
        <HistoryListRow
          title={`Ref: ${deposit.referenceId}`}
          subtitle={formatDate(deposit.createdAt)}
          amount={deposit.amount}
          direction="in"
          status={deposit.status}
          statusClassName={STATUS_STYLES[deposit.status]}
        />
      )}
    />
  );
}

export function DepositHistorySkeleton() {
  return <HistoryCardSkeleton titleWidth="w-32" />;
}
