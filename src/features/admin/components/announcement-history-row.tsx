"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { retractAnnouncementAction } from "@/features/admin/lib/notification-actions";
import type { AnnouncementWithId } from "@/features/admin/hooks/use-admin-announcements";

const AUDIENCE_LABELS: Record<string, string> = {
  all: "All users",
  active_package: "Active package users",
  selected: "Selected users",
};

type AnnouncementHistoryRowProps = {
  announcement: AnnouncementWithId;
  onRetracted: () => void;
};

export function AnnouncementHistoryRow({ announcement, onRetracted }: AnnouncementHistoryRowProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleRetract() {
    if (!user || busy) return;
    setBusy(true);
    setRowError(null);
    try {
      await retractAnnouncementAction(announcement.id, announcement.title, {
        adminUid: user.uid,
        adminName: user.displayName ?? user.email ?? "Admin",
      });
      onRetracted();
    } catch {
      setRowError("Couldn’t retract this notification. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white">{announcement.title}</p>
            {!announcement.isActive && (
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
                Retracted
              </span>
            )}
          </div>
          <p className="text-xs text-white/50">
            {AUDIENCE_LABELS[announcement.audienceType]} · {announcement.recipientCount} recipient(s) ·{" "}
            {formatDate(announcement.createdAt)} · by {announcement.createdByName}
          </p>
        </div>
        {announcement.isActive && (
          <Button variant="outline" size="sm" disabled={busy} onClick={handleRetract}>
            Retract
          </Button>
        )}
      </div>

      <p className="text-sm text-white/70">{announcement.body}</p>

      {rowError && <Alert variant="error">{rowError}</Alert>}
    </div>
  );
}
