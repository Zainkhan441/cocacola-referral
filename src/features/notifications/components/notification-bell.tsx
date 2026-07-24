"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useMyNotifications } from "@/features/notifications/hooks/use-my-notifications";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-unread-notification-count";
import { markOneNotificationRead, markAllNotificationsRead } from "@/features/notifications/lib/actions";
import { formatDate } from "@/lib/format";

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, loading } = useMyNotifications();
  const unreadCount = useUnreadNotificationCount();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllNotificationsRead(notifications).catch(() => {});
  }

  async function handleOpenNotification(notificationId: string, read: boolean) {
    if (!user || read) return;
    await markOneNotificationRead(notificationId).catch(() => {});
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in-up absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-white/10 bg-surface-2 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-brand-light hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && <p className="px-1 py-4 text-center text-xs text-white/40">Loading…</p>}

          {!loading && notifications.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-white/40">No notifications yet.</p>
          )}

          {!loading && notifications.length > 0 && (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(notification.id, notification.read)}
                    className={`flex w-full flex-col gap-0.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5 ${
                      notification.read ? "" : "bg-brand/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {!notification.read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-light" />}
                      <p className="truncate text-xs font-medium text-white">{notification.title}</p>
                    </div>
                    <p className="line-clamp-2 text-xs text-white/50">{notification.body}</p>
                    <p className="text-[10px] text-white/30">{formatDate(notification.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-xl px-2 py-2 text-center text-xs font-medium text-brand-light hover:bg-white/5"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
