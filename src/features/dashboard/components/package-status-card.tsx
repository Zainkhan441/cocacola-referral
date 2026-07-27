"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { formatCurrency } from "@/lib/format";
import type { UserDoc } from "@/lib/firestore/users";

type PackageStatusCardProps = {
  profile: UserDoc;
};

// Packages never expire — this is a plain status display, not a
// countdown. An admin disabling a package template only blocks NEW
// purchases; it never affects an existing holder's own terms or
// eligibility, so this card must not suggest the user needs to act.
export function PackageStatusCard({ profile }: PackageStatusCardProps) {
  const { packageInfo, loading } = usePackageLimits(profile.package);

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

  if (loading) {
    return <PackageStatusCardSkeleton />;
  }

  const unavailableForNewUsers = packageInfo != null && !packageInfo.isActive;
  // This holder's own snapshotted terms — never the package's current live
  // values, so a later admin edit to the template can't retroactively
  // change what's shown here. Falls back to the live value only for
  // pre-migration accounts approved before this snapshot field existed.
  const dailyEarning = profile.packageDailyEarning ?? packageInfo?.dailyEarning ?? 0;
  const dailyTaskLimit = profile.packageDailyTaskLimit ?? packageInfo?.dailyTaskLimit ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Your package</h2>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
          Active
        </span>
      </div>

      <p className="text-xl font-bold text-white">{packageInfo?.name ?? "Package"}</p>

      <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
        <div>
          <p className="text-white/40">Daily earning</p>
          <p className="font-semibold text-white">{formatCurrency(dailyEarning)}</p>
        </div>
        <div>
          <p className="text-white/40">Daily tasks</p>
          <p className="font-semibold text-white">{dailyTaskLimit}</p>
        </div>
      </div>

      {unavailableForNewUsers && (
        <p className="text-xs text-white/40">
          This package is no longer open to new purchases. Your terms are unaffected.
        </p>
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
