"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { formatDate } from "@/lib/format";
import type { UserDoc } from "@/lib/firestore/users";

type PackageStatusCardProps = {
  profile: UserDoc;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Days-remaining/progress don't need per-second precision like the daily
// claim countdown — refreshing once a minute keeps a long-open tab honest
// without a busy timer.
const REFRESH_INTERVAL_MS = 60_000;

export function PackageStatusCard({ profile }: PackageStatusCardProps) {
  const { packageInfo, loading } = usePackageLimits(profile.package);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!profile.package) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Your package</h2>
        <p className="text-sm text-white/60">You don’t have an active package yet.</p>
        <Link href="/packages">
          <Button size="sm">Browse packages</Button>
        </Link>
      </div>
    );
  }

  if (loading || !profile.packageActivatedAt || !profile.packageExpiresAt) {
    return <PackageStatusCardSkeleton />;
  }

  const activatedMs = profile.packageActivatedAt.toMillis();
  const expiresMs = profile.packageExpiresAt.toMillis();
  const totalDurationMs = Math.max(1, expiresMs - activatedMs);
  const elapsedMs = Math.min(Math.max(now - activatedMs, 0), totalDurationMs);
  const progressPercent = Math.round((elapsedMs / totalDurationMs) * 100);
  const daysRemaining = Math.max(0, Math.ceil((expiresMs - now) / MS_PER_DAY));
  const expired = now >= expiresMs;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Your package</h2>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            expired
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {expired ? "Expired" : "Active"}
        </span>
      </div>

      <p className="text-xl font-bold text-white">{packageInfo?.name ?? "Package"}</p>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${expired ? "bg-red-500" : "bg-brand"}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
        <p>
          Days remaining{" "}
          <span className="font-semibold text-white/80">{expired ? 0 : daysRemaining}</span>
        </p>
        <p>
          Expires <span className="font-semibold text-white/80">{formatDate(profile.packageExpiresAt)}</span>
        </p>
      </div>

      {expired && (
        <Link href="/packages">
          <Button size="sm">Renew package</Button>
        </Link>
      )}
    </div>
  );
}

export function PackageStatusCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}
