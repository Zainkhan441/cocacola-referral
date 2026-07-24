import { cn } from "@/lib/utils";

type ComingSoonProps = {
  label: string;
  className?: string;
};

export function ComingSoon({ label, className }: ComingSoonProps) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={`${label} — coming soon`}
      className={cn(
        "inline-flex cursor-not-allowed items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/40",
        className,
      )}
    >
      {label}
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
        Soon
      </span>
    </button>
  );
}
