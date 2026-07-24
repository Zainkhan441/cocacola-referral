"use client";

import { Receipt } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { TransactionStatus, TransactionType } from "@/lib/firestore/transactions";
import { useRecentTransactions } from "@/features/user/hooks/use-recent-transactions";
import { HistoryCard, HistoryCardSkeleton, HistoryListRow } from "@/features/dashboard/components/history-card";

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  referral_reward: "Referral reward",
  daily_reward: "Daily reward",
  package_purchase: "Package purchase",
  task_reward: "Task reward",
  bonus_reward: "Bonus reward",
};

const OUTFLOW_TYPES: ReadonlySet<TransactionType> = new Set([
  "withdrawal",
  "package_purchase",
]);

const STATUS_STYLES: Record<TransactionStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function RecentTransactions() {
  const { transactions, loading, error, retry } = useRecentTransactions();

  return (
    <HistoryCard
      title="Recent transactions"
      loading={loading}
      error={error}
      retry={retry}
      items={transactions}
      emptyMessage="No transactions yet."
      emptyIcon={Receipt}
      itemKey={(transaction, index) => `${transaction.uid}-${index}`}
      renderItem={(transaction) => (
        <HistoryListRow
          title={TYPE_LABELS[transaction.type]}
          subtitle={transaction.description || formatDate(transaction.createdAt)}
          amount={transaction.amount}
          direction={OUTFLOW_TYPES.has(transaction.type) ? "out" : "in"}
          status={transaction.status}
          statusClassName={STATUS_STYLES[transaction.status]}
        />
      )}
    />
  );
}

export function RecentTransactionsSkeleton() {
  return <HistoryCardSkeleton titleWidth="w-36" />;
}
