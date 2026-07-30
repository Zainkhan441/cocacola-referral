"use client";

import { Users } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ReferralRewardStatus } from "@/lib/firestore/referral-rewards";
import { useReferralActivity } from "@/features/user/hooks/use-referral-activity";
import { HistoryCard, HistoryCardSkeleton, HistoryListRow } from "@/features/dashboard/components/history-card";

const STATUS_STYLES: Record<ReferralRewardStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  credited: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export function RecentReferralActivity() {
  const { rewards, loading, error, retry } = useReferralActivity();

  return (
    <HistoryCard
      title="Recent referral activity"
      loading={loading}
      error={error}
      retry={retry}
      items={rewards}
      emptyMessage="No referral activity yet."
      emptyIcon={Users}
      itemKey={(reward, index) => `${reward.sourceUid}-${index}`}
      renderItem={(reward) => (
        <HistoryListRow
          title={`${reward.sourceName} · ${reward.packageName || "package"}`}
          subtitle={`${formatDate(reward.createdAt)} · Ref: ${reward.depositId}`}
          amount={reward.amount}
          direction="in"
          status={reward.status}
          statusClassName={STATUS_STYLES[reward.status]}
        />
      )}
    />
  );
}

export function RecentReferralActivitySkeleton() {
  return <HistoryCardSkeleton titleWidth="w-44" />;
}
