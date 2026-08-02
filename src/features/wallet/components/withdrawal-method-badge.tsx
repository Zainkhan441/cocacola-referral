import Image from "next/image";
import { WITHDRAWAL_METHOD_LABELS } from "@/lib/wallet-labels";
import type { WithdrawalMethod } from "@/lib/firestore/withdrawals";
import { cn } from "@/lib/utils";

// Official brand logos (public/images/*-logo.png) — full wordmark lockups
// on their own white canvas, not transparent icon-only assets, so every
// usage wraps them in a small white rounded chip rather than placing them
// directly on this app's dark surfaces (where the logo's own white
// background would otherwise show as a stray light rectangle). This is
// the same pattern most fintech apps use to display third-party payment
// logos consistently regardless of each brand's own asset styling.
const METHOD_LOGO_SRC: Record<WithdrawalMethod, string> = {
  easypaisa: "/images/easypaisa-logo.png",
  jazzcash: "/images/jazzcash-logo.png",
};

type WithdrawalMethodLogoProps = {
  method: WithdrawalMethod;
  className?: string;
};

// The bare logo chip — reused both inside WithdrawalMethodBadge below
// (history/admin rows, paired with a text label) and directly in the
// withdrawal form's method selector buttons (which already label
// themselves via their own button text) — one visual size/shape wherever
// a logo appears. next/image handles the actual optimization (resizing,
// format negotiation, lazy loading); these are small, never above-the-fold
// hero content, so no `priority` hint is needed.
export function WithdrawalMethodLogo({ method, className }: WithdrawalMethodLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-block h-6 w-6 flex-shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-black/5",
        className,
      )}
    >
      <Image
        src={METHOD_LOGO_SRC[method]}
        alt=""
        aria-hidden="true"
        fill
        sizes="24px"
        className="object-contain p-0.5"
      />
    </span>
  );
}

type WithdrawalMethodBadgeProps = {
  method: WithdrawalMethod;
  className?: string;
};

export function WithdrawalMethodBadge({ method, className }: WithdrawalMethodBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-white/70", className)}>
      <WithdrawalMethodLogo method={method} />
      {WITHDRAWAL_METHOD_LABELS[method]}
    </span>
  );
}
