import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TaskDoc } from "@/lib/firestore/tasks";

type TaskCardProps = {
  task: TaskDoc;
  disabledReason: string | null;
  onSelect: () => void;
};

export function TaskCard({ task, disabledReason, onSelect }: TaskCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-white">{task.title}</h3>
        <span className="flex-shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
          {task.frequency === "daily" ? "Daily" : "One-time"}
        </span>
      </div>

      <p className="text-sm text-white/60">{task.description}</p>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          {task.endDate ? `Ends ${formatDate(task.endDate)}` : "No end date"}
          {task.proofRequired ? " · Proof required" : ""}
        </span>
      </div>

      <p className="text-2xl font-bold text-white">{formatCurrency(task.rewardAmount)}</p>

      <Button size="md" disabled={Boolean(disabledReason)} onClick={onSelect} className="mt-auto">
        {disabledReason ? (
          disabledReason
        ) : (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Complete task
          </>
        )}
      </Button>
    </div>
  );
}
