import { Skeleton } from "@/components/ui/skeleton";

type StatCardProps = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}
