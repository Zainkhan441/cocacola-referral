"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { useMyNotificationHistory } from "@/features/notifications/hooks/use-my-notification-history";
import { markOneNotificationRead, markAllNotificationsRead } from "@/features/notifications/lib/actions";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { formatDate } from "@/lib/format";

export default function NotificationsPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const { notifications, loading, loadingMore, error, hasMore, loadMore, retry } =
    useMyNotificationHistory();

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
    }
  }, [configured, authLoading, user, router]);

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllNotificationsRead(user.uid, notifications).catch(() => {});
    retry();
  }

  async function handleOpen(announcementId: string, read: boolean) {
    if (!user || read) return;
    await markOneNotificationRead(user.uid, announcementId).catch(() => {});
    retry();
  }

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  const gateLoading = authLoading || !user || !user.emailVerified;
  const hasUnread = notifications.some((notification) => !notification.read);

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                <p className="text-sm text-white/50">Your complete notification history.</p>
              </div>
              {hasUnread && (
                <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                  Mark all read
                </Button>
              )}
            </div>

            {loading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
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

            {!loading && !error && notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-14 text-center">
                <Bell className="h-6 w-6 text-white/30" aria-hidden="true" />
                <p className="text-sm text-white/50">You have no notifications yet.</p>
              </div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <div className="flex flex-col gap-3">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleOpen(notification.announcementId, notification.read)}
                    className={`flex flex-col gap-1 rounded-2xl border border-white/10 p-4 text-left transition-colors hover:border-white/20 sm:p-5 ${
                      notification.read ? "bg-surface-2" : "bg-brand/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-light" />
                        )}
                        <p className="font-semibold text-white">{notification.title}</p>
                      </div>
                      <p className="flex-shrink-0 text-xs text-white/40">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm text-white/60">{notification.body}</p>
                  </button>
                ))}
                <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
