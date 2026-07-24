"use client";

import { useState } from "react";
import { Award } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { setBonusTierActiveAction } from "@/features/admin/lib/bonus-actions";
import type { BonusTierDoc } from "@/lib/firestore/bonus-tiers";

type BonusTierListProps = {
  tiers: BonusTierDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onEdit: (tier: BonusTierDoc) => void;
};

export function BonusTierList({ tiers, loading, error, retry, onEdit }: BonusTierListProps) {
  const { user } = useAuth();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleToggle(tier: BonusTierDoc) {
    if (!user || togglingId) return;
    setToggleError(null);
    setTogglingId(tier.id);
    try {
      await setBonusTierActiveAction(tier.id, tier.name, !tier.isActive, {
        adminUid: user.uid,
        adminName: user.displayName ?? user.email ?? "Admin",
      });
    } catch {
      setToggleError("Couldn’t update that tier. Please try again.");
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

  if (tiers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
        <Award className="h-6 w-6 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">
          No bonus tiers yet. Create the first one above — no defaults are seeded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {toggleError && <Alert variant="error">{toggleError}</Alert>}
      {tiers.map((tier) => (
        <div
          key={tier.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{tier.name}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  tier.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/50"
                }`}
              >
                {tier.isActive ? "Active" : "Disabled"}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
                {tier.recurrence === "recurring" ? "Recurring" : "One-time"}
              </span>
            </div>
            <p className="text-xs text-white/50">
              Bonus {formatCurrency(tier.bonusAmount)} · Requires {tier.requiredDirectReferrals} direct,{" "}
              {tier.requiredTotalTeam} total team, {tier.requiredActiveTeam} active team
              {tier.requiredPackageId ? " · specific package required" : ""}
            </p>
          </div>

          <div className="flex flex-shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(tier)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={togglingId === tier.id}
              onClick={() => handleToggle(tier)}
            >
              {togglingId === tier.id ? "…" : tier.isActive ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
