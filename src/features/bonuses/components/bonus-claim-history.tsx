"use client";

import { Award } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useMyBonusClaims } from "@/features/bonuses/hooks/use-my-bonus-claims";
import { HistoryListRow } from "@/features/dashboard/components/history-card";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import type { BonusClaimStatus } from "@/lib/firestore/bonus-claims";

const STATUS_STYLES: Record<BonusClaimStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function BonusClaimHistory() {
  const { claims, loading, loadingMore, error, hasMore, loadMore, retry } = useMyBonusClaims();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">Your bonus claims</h2>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry} className="self-start">
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && claims.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <Award className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">You haven’t claimed any bonuses yet.</p>
        </div>
      )}

      {!loading && !error && claims.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-white/10">
            {claims.map((claim) => (
              <li key={claim.id} className="py-3 first:pt-0 last:pb-0">
                <HistoryListRow
                  title={claim.tierName}
                  subtitle={formatDate(claim.createdAt)}
                  amount={claim.bonusAmount}
                  direction="in"
                  status={claim.status}
                  statusClassName={STATUS_STYLES[claim.status]}
                />
              </li>
            ))}
          </ul>
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </>
      )}
    </div>
  );
}
