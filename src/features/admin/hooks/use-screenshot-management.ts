"use client";

import { useEffect, useState } from "react";
import { getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { depositsWithScreenshotHistoryQuery, type DepositDoc } from "@/lib/firestore/deposits";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type ScreenshotDepositWithId = DepositDoc & { id: string };

export type ScreenshotStatusFilter = "all" | "available" | "deleted";

export type ScreenshotManagementStats = {
  // "Total screenshots" — currently stored (available) count; deleted ones
  // no longer occupy any storage, so they're not counted here.
  availableCount: number;
  deletedCount: number;
  // Sum of screenshotSizeBytes across every screenshot still available —
  // deleted ones no longer occupy any Firestore storage, so they're
  // deliberately excluded from this total.
  totalAvailableSizeBytes: number;
  averageSizeBytes: number;
  largestAvailable: ScreenshotDepositWithId | null;
  oldestAvailable: ScreenshotDepositWithId | null;
  // Approved/rejected deposits (already reviewed) whose screenshot is still
  // sitting in Firestore — the ones an admin should actually go clean up.
  awaitingCleanupCount: number;
};

function computeStats(deposits: ScreenshotDepositWithId[]): ScreenshotManagementStats {
  let availableCount = 0;
  let deletedCount = 0;
  let totalAvailableSizeBytes = 0;
  let awaitingCleanupCount = 0;
  let oldestAvailable: ScreenshotDepositWithId | null = null;
  let largestAvailable: ScreenshotDepositWithId | null = null;

  for (const deposit of deposits) {
    if (deposit.screenshotStatus === "available") {
      availableCount++;
      totalAvailableSizeBytes += deposit.screenshotSizeBytes ?? 0;
      if (deposit.status !== "pending") awaitingCleanupCount++;
      if (!oldestAvailable || deposit.createdAt.toMillis() < oldestAvailable.createdAt.toMillis()) {
        oldestAvailable = deposit;
      }
      if (
        !largestAvailable ||
        (deposit.screenshotSizeBytes ?? 0) > (largestAvailable.screenshotSizeBytes ?? 0)
      ) {
        largestAvailable = deposit;
      }
    } else if (deposit.screenshotStatus === "deleted") {
      deletedCount++;
    }
  }

  return {
    availableCount,
    deletedCount,
    totalAvailableSizeBytes,
    averageSizeBytes: availableCount > 0 ? Math.round(totalAvailableSizeBytes / availableCount) : 0,
    largestAvailable,
    oldestAvailable,
    awaitingCleanupCount,
  };
}

type UseScreenshotManagementResult = {
  deposits: ScreenshotDepositWithId[];
  stats: ScreenshotManagementStats;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// Single unpaginated fetch of every deposit that has ever had a screenshot
// — realistic volume for a "clean up regularly" admin workflow is small
// (this is precisely what the dashboard exists to keep small), so this
// mirrors the same simple-at-this-scale pattern already used for packages/
// tasks elsewhere in this app rather than adding pagination for a
// collection this dashboard's own purpose keeps naturally bounded.
export function useScreenshotManagement(): UseScreenshotManagementResult {
  const canFetch = Boolean(db);

  const [deposits, setDeposits] = useState<ScreenshotDepositWithId[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setDeposits([]);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;
    let cancelled = false;

    getDocs(depositsWithScreenshotHistoryQuery(firestore))
      .then((snapshot) => {
        if (cancelled) return;
        setDeposits(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load screenshot data. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, attempt]);

  return {
    deposits,
    stats: computeStats(deposits),
    loading: canFetch ? loading : false,
    error,
    retry: () => setAttempt((count) => count + 1),
  };
}
