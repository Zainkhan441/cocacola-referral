"use client";

import { ClipboardList } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useAdminActivityLogs } from "@/features/admin/hooks/use-admin-activity-logs";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";

export default function AdminActivityPage() {
  const { logs, loading, loadingMore, error, hasMore, loadMore, retry } = useAdminActivityLogs();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Activity log</h1>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
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

      {!loading && !error && logs.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <ClipboardList className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No admin activity yet.</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="flex flex-col gap-3">
          {logs.map((log, index) => (
            <div
              key={`${log.actorUid}-${index}`}
              className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-surface-2 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{log.details}</p>
                <span className="text-xs text-white/40">{formatDate(log.createdAt)}</span>
              </div>
              <p className="text-xs text-white/50">
                {log.actorName} · {log.action}
              </p>
            </div>
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
