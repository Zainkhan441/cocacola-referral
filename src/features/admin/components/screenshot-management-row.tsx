import { formatCurrency, formatDate } from "@/lib/format";
import { DepositScreenshotControls } from "@/features/admin/components/deposit-screenshot-controls";
import type { DepositStatus } from "@/lib/firestore/deposits";
import type { ScreenshotDepositWithId } from "@/features/admin/hooks/use-screenshot-management";

const STATUS_STYLES: Record<DepositStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
};

type ScreenshotManagementRowProps = {
  deposit: ScreenshotDepositWithId;
  onChanged: () => void;
  selected: boolean;
  onToggleSelected: () => void;
};

export function ScreenshotManagementRow({
  deposit,
  onChanged,
  selected,
  onToggleSelected,
}: ScreenshotManagementRowProps) {
  const canSelect = deposit.screenshotStatus === "available";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {canSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              aria-label="Select for quick review"
              className="mt-1 h-4 w-4 rounded border-white/30 bg-surface-3"
            />
          )}
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-white">{deposit.userName}</p>
            <p className="text-xs text-white/50">
              {formatDate(deposit.createdAt)} · Ref: {deposit.referenceId}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-bold text-white">{formatCurrency(deposit.amount)}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[deposit.status]}`}
          >
            {deposit.status}
          </span>
        </div>
      </div>

      <DepositScreenshotControls deposit={deposit} onChanged={onChanged} forceShowImage={selected} />
    </div>
  );
}
