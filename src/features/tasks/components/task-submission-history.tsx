"use client";

import { ClipboardList } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useMyTaskSubmissions } from "@/features/tasks/hooks/use-my-task-submissions";
import { HistoryListRow } from "@/features/dashboard/components/history-card";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import type { TaskSubmissionStatus } from "@/lib/firestore/task-submissions";

const STATUS_STYLES: Record<TaskSubmissionStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
};

// The user's COMPLETE task submission history (paginated), distinct from
// the dashboard's other HistoryCard-based panels which only ever show a
// fixed "recent N" — Milestone 12 explicitly asked for a complete history.
export function TaskSubmissionHistory() {
  const { submissions, loading, loadingMore, error, hasMore, loadMore, retry } =
    useMyTaskSubmissions();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">Your task submissions</h2>

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

      {!loading && !error && submissions.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <ClipboardList className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">You haven’t submitted any tasks yet.</p>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-white/10">
            {submissions.map((submission) => (
              <li key={submission.id} className="py-3 first:pt-0 last:pb-0">
                <HistoryListRow
                  title={submission.taskTitle}
                  subtitle={formatDate(submission.createdAt)}
                  amount={submission.rewardAmount}
                  direction="in"
                  status={submission.status}
                  statusClassName={STATUS_STYLES[submission.status]}
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
