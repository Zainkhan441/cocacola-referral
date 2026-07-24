"use client";

import { useState } from "react";
import { Package as PackageIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { setPackageActiveAction } from "@/features/admin/lib/package-actions";
import type { PackageDoc } from "@/lib/firestore/packages";

type PackageListProps = {
  packages: PackageDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onEdit: (pkg: PackageDoc) => void;
};

export function PackageList({ packages, loading, error, retry, onEdit }: PackageListProps) {
  const { user } = useAuth();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleToggle(pkg: PackageDoc) {
    if (!user || togglingId) return;
    setToggleError(null);
    setTogglingId(pkg.id);
    try {
      await setPackageActiveAction(
        pkg.id,
        pkg.name,
        !pkg.isActive,
        { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" },
      );
    } catch {
      setToggleError("Couldn’t update that package. Please try again.");
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
        <PackageIcon className="h-6 w-6 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">No packages yet. Create the first one above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {toggleError && <Alert variant="error">{toggleError}</Alert>}
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{pkg.name}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  pkg.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/50"
                }`}
              >
                {pkg.isActive ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-white/50">
              Price {formatCurrency(pkg.price)} · Duration {pkg.durationDays} day
              {pkg.durationDays === 1 ? "" : "s"} · Daily earning {formatCurrency(pkg.dailyEarning)} ·
              Withdrawal limit {formatCurrency(pkg.withdrawalLimitPerRequest)}/request,{" "}
              {formatCurrency(pkg.dailyWithdrawalLimit)}/day
            </p>
            {pkg.features.length > 0 && (
              <p className="text-xs text-white/40">{pkg.features.join(" · ")}</p>
            )}
          </div>

          <div className="flex flex-shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(pkg)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={togglingId === pkg.id}
              onClick={() => handleToggle(pkg)}
            >
              {togglingId === pkg.id ? "…" : pkg.isActive ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
