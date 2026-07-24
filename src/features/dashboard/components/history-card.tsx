import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";

type HistoryCardProps<T> = {
  title: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
  items: T[];
  emptyMessage: string;
  emptyIcon: LucideIcon;
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T) => ReactNode;
};

export function HistoryCard<T>({
  title,
  loading,
  error,
  retry,
  items,
  emptyMessage,
  emptyIcon: EmptyIcon,
  itemKey,
  renderItem,
}: HistoryCardProps<T>) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry} className="self-start">
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <EmptyIcon className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">{emptyMessage}</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/10">
          {items.map((item, index) => (
            <li key={itemKey(item, index)} className="py-3 first:pt-0 last:pb-0">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HistoryCardSkeleton({ titleWidth = "w-36" }: { titleWidth?: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <Skeleton className={`h-4 ${titleWidth}`} />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

type HistoryListRowProps = {
  title: string;
  subtitle: string;
  amount: number;
  direction: "in" | "out";
  status: string;
  statusClassName: string;
};

export function HistoryListRow({
  title,
  subtitle,
  amount,
  direction,
  status,
  statusClassName,
}: HistoryListRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="truncate text-xs text-white/50">{subtitle}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <p
          className={
            direction === "out"
              ? "text-sm font-semibold text-red-400"
              : "text-sm font-semibold text-emerald-400"
          }
        >
          {direction === "out" ? "-" : "+"}
          {formatCurrency(amount)}
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusClassName}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
