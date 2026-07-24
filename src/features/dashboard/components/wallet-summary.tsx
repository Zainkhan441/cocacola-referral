import type { UserDoc } from "@/lib/firestore/users";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

type WalletSummaryProps = {
  profile: UserDoc;
};

const CARDS: Array<{
  label: string;
  key: keyof Pick<
    UserDoc,
    "walletBalance" | "currentBalance" | "cocaColaEarning" | "staffEarning" | "totalEarnings" | "todayEarnings"
  >;
}> = [
  { label: "Deposit Wallet", key: "walletBalance" },
  { label: "Current Balance", key: "currentBalance" },
  { label: "Coca-Cola Earning", key: "cocaColaEarning" },
  { label: "Staff Earning", key: "staffEarning" },
  { label: "Total earnings", key: "totalEarnings" },
  { label: "Today’s earnings", key: "todayEarnings" },
];

export function WalletSummary({ profile }: WalletSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">
            {card.label}
          </p>
          <p className="text-xl font-bold text-white sm:text-2xl">
            {formatCurrency(profile[card.key])}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WalletSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
