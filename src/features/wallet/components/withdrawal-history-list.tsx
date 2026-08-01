"use client";

import { useMemo } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { WithdrawalStatus } from "@/lib/firestore/withdrawals";
import { useWithdrawalHistory } from "@/features/wallet/hooks/use-withdrawal-history";
import { WithdrawalMethodBadge } from "@/features/wallet/components/withdrawal-method-badge";
import { HistoryCard, HistoryCardSkeleton, HistoryListRow } from "@/features/dashboard/components/history-card";

// Exact UI mapping, per product decision: pending -> yellow "Pending",
// approved/paid -> green "Success" ("paid" is a reserved status value the
// approval flow never actually writes today, but is mapped defensively in
// case that changes), rejected -> red "Rejected". This is the single
// canonical withdrawal-history row renderer — both the Wallet page's
// "Withdrawal history" card and the Dashboard's own card render through
// this exact component (see withdrawal-history.tsx / transaction-history.tsx),
// backed by the SAME useWithdrawalHistory listener, so there is only ever
// one live subscription to this data per mounted page, never a second
// implementation to keep in sync.
const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "Pending",
  approved: "Success",
  rejected: "Rejected",
  paid: "Success",
};

const STATUS_STYLES: Record<WithdrawalStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

type WithdrawalHistoryListProps = {
  title?: string;
};

export function WithdrawalHistoryList({ title = "Withdrawal history" }: WithdrawalHistoryListProps) {
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
      title={title}
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
          meta={<WithdrawalMethodBadge method={withdrawal.method} className="mt-0.5" />}
          amount={withdrawal.amount}
          direction="out"
          status={STATUS_LABELS[withdrawal.status]}
          statusClassName={STATUS_STYLES[withdrawal.status]}
        />
      )}
    />
  );
}

export function WithdrawalHistoryListSkeleton({ titleWidth = "w-40" }: { titleWidth?: string }) {
  return <HistoryCardSkeleton titleWidth={titleWidth} />;
}
