"use client";

import { CheckCircle2, Lock, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { LEVEL_THRESHOLDS, calculateLevel, levelLabel } from "@/lib/level";
import { useBonusTiers } from "@/features/bonuses/hooks/use-bonus-tiers";
import type { TeamSummary } from "@/features/user/hooks/use-team-summary";

type LevelLadderProps = {
  summary: TeamSummary | null;
  summaryLoading: boolean;
};

// All 12 levels, always shown (never just the active/configured ones —
// that's the Bonus page's job). Thresholds come from the shared LEVEL_
// THRESHOLDS table (always available, no Firestore dependency), and are
// cross-referenced by requiredDirectReferrals against the seeded
// bonusTiers docs (once an admin seeds/configures them) purely to show the
// real, admin-set prize amount and active/inactive status — never a
// second, independently-invented threshold source.
export function LevelLadder({ summary, summaryLoading }: LevelLadderProps) {
  const { tiers, loading: tiersLoading, error, retry } = useBonusTiers();
  const loading = summaryLoading || tiersLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
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

  const directActive = summary?.directActive ?? 0;
  const current = calculateLevel(directActive);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {LEVEL_THRESHOLDS.map((threshold, index) => {
        const levelNumber = index + 1;
        const tier = tiers.find((t) => t.requiredDirectReferrals === threshold);
        const completed = directActive >= threshold;
        const isCurrent = current.level === levelNumber;

        return (
          <div
            key={levelNumber}
            className={`flex flex-col gap-2 rounded-2xl border p-4 ${
              isCurrent
                ? "border-brand bg-brand/10"
                : completed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 bg-surface-2"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{tier?.name ?? levelLabel(levelNumber)}</p>
              {completed ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                <Lock className="h-4 w-4 flex-shrink-0 text-white/30" aria-hidden="true" />
              )}
            </div>
            <p className="text-xs text-white/50">{threshold.toLocaleString()} active direct referrals</p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="flex items-center gap-1 text-xs font-medium text-white/70">
                <Trophy className="h-3.5 w-3.5 text-brand-light" aria-hidden="true" />
                {tier ? formatCurrency(tier.bonusAmount) : "Not configured"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  tier?.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/50"
                }`}
              >
                {tier?.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
