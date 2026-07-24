"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReferralRewards } from "@/features/admin/hooks/use-admin-referral-rewards";
import { ReferralRewardRow } from "@/features/admin/components/referral-reward-row";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import type { RewardLevelFilter } from "@/lib/firestore/referral-rewards";

export default function AdminReferralLogsPage() {
  const [levelFilter, setLevelFilter] = useState<RewardLevelFilter>("all");
  const { rewards, loading, loadingMore, error, hasMore, loadMore, retry } =
    useAdminReferralRewards(levelFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Referral reward logs</h1>
          <p className="text-sm text-white/50">Every referral reward ever credited, across all 12 levels.</p>
        </div>
        <select
          value={levelFilter === "all" ? "all" : String(levelFilter)}
          onChange={(event) =>
            setLevelFilter(event.target.value === "all" ? "all" : Number(event.target.value))
          }
          className="rounded-xl border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        >
          <option value="all">All levels</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && rewards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-white/50">No referral rewards have been credited yet.</p>
        </div>
      )}

      {!loading && !error && rewards.length > 0 && (
        <div className="flex flex-col gap-3">
          {rewards.map((reward) => (
            <ReferralRewardRow key={reward.id} reward={reward} />
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
