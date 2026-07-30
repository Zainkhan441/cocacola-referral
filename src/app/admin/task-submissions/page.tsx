"use client";

import { useState } from "react";
import { useAdminTaskSubmissions } from "@/features/admin/hooks/use-admin-task-submissions";
import { TaskSubmissionReviewRow } from "@/features/admin/components/task-submission-review-row";
import { StatusFilterTabs } from "@/features/admin/components/status-filter-tabs";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskSubmissionStatusFilter } from "@/lib/firestore/task-submissions";

const STATUS_OPTIONS: Array<{ label: string; value: TaskSubmissionStatusFilter }> = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

export default function AdminTaskSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<TaskSubmissionStatusFilter>("pending");
  const { submissions, loading, loadingMore, error, hasMore, loadMore, retry } =
    useAdminTaskSubmissions(statusFilter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Task submissions (legacy)</h1>
        <p className="text-sm text-white/50">
          Historical view of the old, admin-reviewed task submission flow. The current ad-watch
          task system no longer creates new submissions here — every ad completion is automatic
          and unlocks the bundled daily reward directly (see the Tasks admin page). This page
          exists only to resolve any submission still pending from before that change.
        </p>
      </div>

      <StatusFilterTabs options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-2xl" />
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

      {!loading && !error && submissions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-white/50">No task submissions here yet.</p>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="flex flex-col gap-3">
          {submissions.map((submission) => (
            <TaskSubmissionReviewRow key={submission.id} submission={submission} onReviewed={retry} />
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
