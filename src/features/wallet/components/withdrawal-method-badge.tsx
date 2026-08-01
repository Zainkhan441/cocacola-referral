import { WITHDRAWAL_METHOD_LABELS } from "@/lib/wallet-labels";
import type { WithdrawalMethod } from "@/lib/firestore/withdrawals";
import { cn } from "@/lib/utils";

// No real Easypaisa/JazzCash logo assets exist in this project — rather
// than fabricate a placeholder brand logo, this is a plain colored-initial
// badge. Deliberately NOT using each brand's real-world color (Easypaisa
// green / JazzCash red): those would visually collide with this app's own
// status colors (emerald "Success" / red "Rejected") shown right next to
// this badge in the same row, making it ambiguous at a glance whether a
// color refers to the payment method or the request's status. Sky and
// violet are neutral, premium, and unambiguous against both the dark theme
// and the status badges.
const METHOD_STYLES: Record<WithdrawalMethod, string> = {
  easypaisa: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  jazzcash: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const METHOD_INITIALS: Record<WithdrawalMethod, string> = {
  easypaisa: "E",
  jazzcash: "J",
};

type WithdrawalMethodBadgeProps = {
  method: WithdrawalMethod;
  className?: string;
};

export function WithdrawalMethodBadge({ method, className }: WithdrawalMethodBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-white/70", className)}>
      <span
        className={cn(
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          METHOD_STYLES[method],
        )}
        aria-hidden="true"
      >
        {METHOD_INITIALS[method]}
      </span>
      {WITHDRAWAL_METHOD_LABELS[method]}
    </span>
  );
}
