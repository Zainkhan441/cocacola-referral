import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { PackageDoc } from "@/lib/firestore/packages";

type PackageCardProps = {
  pkg: PackageDoc;
  isCurrent: boolean;
  disabledReason?: string | null;
  onSelect: () => void;
};

export function PackageCard({ pkg, isCurrent, disabledReason, onSelect }: PackageCardProps) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
        <span
          className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            pkg.isActive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/15 bg-white/5 text-white/50"
          }`}
        >
          {pkg.isActive ? "Active" : "Unavailable"}
        </span>
      </div>

      <p className="text-3xl font-bold text-white">{formatCurrency(pkg.price)}</p>

      <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
        <div>
          <p className="text-white/40">Daily earning</p>
          <p className="font-semibold text-white">{formatCurrency(pkg.dailyEarning)}</p>
        </div>
        <div>
          <p className="text-white/40">Daily tasks</p>
          <p className="font-semibold text-white">{pkg.dailyTaskLimit}</p>
        </div>
      </div>

      {pkg.features.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-white/10 pt-4">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-light" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      <Button
        size="md"
        disabled={!pkg.isActive || isCurrent || Boolean(disabledReason)}
        onClick={onSelect}
        className="mt-auto"
      >
        {isCurrent
          ? "Your current package"
          : disabledReason
            ? disabledReason
            : pkg.isActive
              ? "Select this package"
              : "Unavailable"}
      </Button>
    </div>
  );
}
