import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { TeamSummary } from "@/features/user/hooks/use-team-summary";

type TeamSummaryCardsProps = {
  summary: TeamSummary | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
    </div>
  );
}

export function TeamSummaryCards({ summary, loading, error, retry }: TeamSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
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

  return (
    <div className="grid grid-cols-2 gap-4">
      <SummaryStat label="Total team" value={(summary?.total ?? 0).toLocaleString()} />
      <SummaryStat label="Active team" value={(summary?.active ?? 0).toLocaleString()} />
    </div>
  );
}
