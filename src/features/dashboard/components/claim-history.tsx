"use client";

import { Gift } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useDailyRewardHistory } from "@/features/earnings/hooks/use-daily-reward-history";
import { HistoryCard, HistoryCardSkeleton, HistoryListRow } from "@/features/dashboard/components/history-card";

export function ClaimHistory() {
  const { rewards, loading, error, retry } = useDailyRewardHistory();

  return (
    <HistoryCard
      title="Claim history"
      loading={loading}
      error={error}
      retry={retry}
      items={rewards}
      emptyMessage="No claims yet."
      emptyIcon={Gift}
      itemKey={(reward, index) => `${reward.rewardDate}-${index}`}
      renderItem={(reward) => (
        <HistoryListRow
          title="Daily earning"
          subtitle={formatDate(reward.createdAt)}
          amount={reward.amount}
          direction="in"
          status={reward.status}
          statusClassName="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        />
      )}
    />
  );
}

export function ClaimHistorySkeleton() {
  return <HistoryCardSkeleton titleWidth="w-32" />;
}
