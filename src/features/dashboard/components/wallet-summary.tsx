"use client";

import type { ReactNode } from "react";
import type { UserDoc } from "@/lib/firestore/users";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralEarnings } from "@/features/user/hooks/use-referral-earnings";

type WalletSummaryProps = {
  profile: UserDoc;
};

const BALANCE_CARDS: Array<{
  label: string;
  key: keyof Pick<UserDoc, "walletBalance" | "currentBalance" | "cocaColaEarning" | "totalEarnings" | "todayEarnings">;
}> = [
  { label: "Deposit Wallet", key: "walletBalance" },
  { label: "Current Balance", key: "currentBalance" },
  { label: "Coca-Cola Earning", key: "cocaColaEarning" },
  { label: "Total earnings", key: "totalEarnings" },
  { label: "Today’s earnings", key: "todayEarnings" },
];

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
      {children}
    </div>
  );
}

// "Staff Earning" is not an independent wallet — the referral commission it
// reports is the SAME money already counted in Current Balance above (see
// approveDeposit's top-level doc comment). This card is a live, computed
// reporting figure (sum of the referralRewards ledger), never a stored
// balance, so it can never drift from Current Balance or double-count.
export function WalletSummary({ profile }: WalletSummaryProps) {
  const { total: staffEarningTotal, loading, error, retry } = useReferralEarnings();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {BALANCE_CARDS.map((card) => (
        <Card key={card.key} label={card.label}>
          <p className="text-xl font-bold text-white sm:text-2xl">{formatCurrency(profile[card.key])}</p>
        </Card>
      ))}
      <Card label="Staff Earning">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : error ? (
          <button
            type="button"
            onClick={retry}
            className="text-left text-xs text-red-400 underline decoration-dotted underline-offset-2"
          >
            Retry
          </button>
        ) : (
          <p className="text-xl font-bold text-white sm:text-2xl">
            {formatCurrency(staffEarningTotal ?? 0)}
          </p>
        )}
      </Card>
    </div>
  );
}

export function WalletSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
