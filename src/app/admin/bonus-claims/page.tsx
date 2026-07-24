"use client";

import { useState } from "react";
import { useAdminBonusClaims } from "@/features/admin/hooks/use-admin-bonus-claims";
import { BonusClaimReviewRow } from "@/features/admin/components/bonus-claim-review-row";
import { StatusFilterTabs } from "@/features/admin/components/status-filter-tabs";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BonusClaimStatusFilter } from "@/lib/firestore/bonus-claims";

const STATUS_OPTIONS: Array<{ label: string; value: BonusClaimStatusFilter }> = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

export default function AdminBonusClaimsPage() {
  const [statusFilter, setStatusFilter] = useState<BonusClaimStatusFilter>("pending");
  const { claims, loading, loadingMore, error, hasMore, loadMore, retry } =
    useAdminBonusClaims(statusFilter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bonus claims</h1>
        <p className="text-sm text-white/50">
          Eligibility and payment log for salary/level bonus claims. Approving re-verifies live team
          data before crediting anything.
        </p>
      </div>

      <StatusFilterTabs options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
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

      {!loading && !error && claims.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-white/50">No bonus claims here yet.</p>
        </div>
      )}

      {!loading && !error && claims.length > 0 && (
        <div className="flex flex-col gap-3">
          {claims.map((claim) => (
            <BonusClaimReviewRow key={claim.id} claim={claim} onReviewed={retry} />
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
