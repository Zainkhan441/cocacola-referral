import { Skeleton } from "@/components/ui/skeleton";
import { REFERRAL_LEVELS } from "@/lib/firestore/team-members";
import type { TeamSummary } from "@/features/user/hooks/use-team-summary";

type TeamLevelBreakdownProps = {
  summary: TeamSummary | null;
  loading: boolean;
};

export function TeamLevelBreakdown({ summary, loading }: TeamLevelBreakdownProps) {
  const levels = Array.from({ length: REFERRAL_LEVELS }, (_, index) => index + 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold text-white">Level-wise breakdown</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {levels.map((level) => (
          <div
            key={level}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/30 py-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Level {level}
            </p>
            {loading ? (
              <Skeleton className="h-5 w-8" />
            ) : (
              <p className="text-lg font-bold text-white">
                {(summary?.levelCounts[level] ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
