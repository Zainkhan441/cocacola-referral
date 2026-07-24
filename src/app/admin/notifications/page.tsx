"use client";

import { useAdminAnnouncements } from "@/features/admin/hooks/use-admin-announcements";
import { NotificationComposeForm } from "@/features/admin/components/notification-compose-form";
import { AnnouncementHistoryRow } from "@/features/admin/components/announcement-history-row";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminNotificationsPage() {
  const { announcements, loading, loadingMore, error, hasMore, loadMore, retry } =
    useAdminAnnouncements();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-sm text-white/50">Broadcast a message to your users and review send history.</p>
      </div>

      <NotificationComposeForm onSent={retry} />

      <h2 className="text-sm font-semibold text-white">History</h2>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
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

      {!loading && !error && announcements.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-white/50">No notifications sent yet.</p>
        </div>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="flex flex-col gap-3">
          {announcements.map((announcement) => (
            <AnnouncementHistoryRow key={announcement.id} announcement={announcement} onRetracted={retry} />
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
