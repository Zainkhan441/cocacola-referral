"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDeposits, type DepositStatusFilter } from "@/features/admin/hooks/use-admin-deposits";
import { DepositReviewRow } from "@/features/admin/components/deposit-review-row";
import { StatusFilterTabs } from "@/features/admin/components/status-filter-tabs";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";

const STATUS_OPTIONS: ReadonlyArray<{ label: string; value: DepositStatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function AdminDepositsPage() {
  const [status, setStatus] = useState<DepositStatusFilter>("pending");
  const { deposits, loading, loadingMore, error, hasMore, loadMore, retry } = useAdminDeposits(status);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Deposits</h1>

      <StatusFilterTabs options={STATUS_OPTIONS} value={status} onChange={setStatus} />

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

      {!loading && !error && deposits.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <Inbox className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No {status === "all" ? "" : status} deposit requests.</p>
        </div>
      )}

      {!loading && !error && deposits.length > 0 && (
        <div className="flex flex-col gap-3">
          {deposits.map((deposit) => (
            <DepositReviewRow key={deposit.id} deposit={deposit} onReviewed={retry} />
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
