"use client";

import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusFilterTabs } from "@/features/admin/components/status-filter-tabs";
import { ScreenshotManagementRow } from "@/features/admin/components/screenshot-management-row";
import {
  useScreenshotManagement,
  type ScreenshotStatusFilter,
} from "@/features/admin/hooks/use-screenshot-management";
import type { DepositStatus } from "@/lib/firestore/deposits";
import { formatBytes, formatDate } from "@/lib/format";

type DepositStatusFilter = DepositStatus | "all";

const DEPOSIT_STATUS_OPTIONS: ReadonlyArray<{ label: string; value: DepositStatusFilter }> = [
  { label: "All deposits", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const SCREENSHOT_STATUS_OPTIONS: ReadonlyArray<{ label: string; value: ScreenshotStatusFilter }> = [
  { label: "All screenshots", value: "all" },
  { label: "Screenshot available", value: "available" },
  { label: "Screenshot deleted", value: "deleted" },
];

// A small, dedicated admin section for keeping the Base64-in-Firestore
// screenshot approach from accumulating forever (this project stays on the
// Spark/free plan by design — no Firebase Storage) — surfaces exactly how
// much is currently stored and lets an admin quickly find and clean up
// already-reviewed deposits whose proof image is no longer needed.
//
// Selection below is deliberately VIEW-ONLY ("quick review" of several
// screenshots at once) — there is no bulk-delete action anywhere in this
// page, by design: every deletion still goes through its own row's
// DeleteScreenshotModal and its own confirmation.
export default function ScreenshotManagementPage() {
  const { deposits, stats, loading, error, retry } = useScreenshotManagement();
  const [depositStatusFilter, setDepositStatusFilter] = useState<DepositStatusFilter>("all");
  const [screenshotStatusFilter, setScreenshotStatusFilter] = useState<ScreenshotStatusFilter>("available");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const filtered = useMemo(() => {
    return deposits
      .filter((d) => depositStatusFilter === "all" || d.status === depositStatusFilter)
      .filter((d) => screenshotStatusFilter === "all" || d.screenshotStatus === screenshotStatusFilter)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [deposits, depositStatusFilter, screenshotStatusFilter]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach((d) => next.delete(d.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((d) => next.add(d.id));
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Screenshot Management</h1>
        <p className="mt-1 text-sm text-white/50">
          Payment proof screenshots are stored directly in Firestore (no Firebase Storage, no paid
          service). Download and permanently delete them once verified to keep database storage
          from growing without bound.
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
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

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
              <p className="text-xs text-white/50">Total screenshots</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.availableCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
              <p className="text-xs text-white/50">Total storage used</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatBytes(stats.totalAvailableSizeBytes)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
              <p className="text-xs text-white/50">Average screenshot size</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatBytes(stats.averageSizeBytes)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
              <p className="text-xs text-white/50">Largest screenshot</p>
              <p className="mt-1 text-lg font-bold text-white">
                {stats.largestAvailable ? formatBytes(stats.largestAvailable.screenshotSizeBytes ?? 0) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
              <p className="text-xs text-white/50">Oldest screenshot</p>
              <p className="mt-1 text-lg font-bold text-white">
                {stats.oldestAvailable ? formatDate(stats.oldestAvailable.createdAt) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-surface-2 p-4">
              <p className="text-xs text-white/50">Awaiting cleanup</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.awaitingCleanupCount}</p>
              <p className="text-[11px] text-white/40">Already approved/rejected</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <StatusFilterTabs options={DEPOSIT_STATUS_OPTIONS} value={depositStatusFilter} onChange={setDepositStatusFilter} />
            <StatusFilterTabs options={SCREENSHOT_STATUS_OPTIONS} value={screenshotStatusFilter} onChange={setScreenshotStatusFilter} />
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5">
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-white/30 bg-surface-3"
                />
                Select all visible
              </label>
              <span className="text-xs text-white/40">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected for quick review`
                  : "Select screenshots to review several at once — this never deletes anything"}
              </span>
              {selectedIds.size > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear selection
                </Button>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
              <ImageOff className="h-6 w-6 text-white/30" aria-hidden="true" />
              <p className="text-sm text-white/50">No deposits match this filter.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((deposit) => (
                <ScreenshotManagementRow
                  key={deposit.id}
                  deposit={deposit}
                  onChanged={retry}
                  selected={selectedIds.has(deposit.id)}
                  onToggleSelected={() => toggleSelected(deposit.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
