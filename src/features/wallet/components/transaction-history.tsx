"use client";

import { ArrowUpFromLine } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useWithdrawalHistory } from "@/features/wallet/hooks/use-withdrawal-history";
import { HistoryListRow } from "@/features/dashboard/components/history-card";
import { WITHDRAWAL_SOURCE_WALLET_LABELS } from "@/lib/wallet-labels";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

// The Wallet page's Withdraw History — pending and approved withdrawal
// requests only. Rejected requests are deliberately excluded here (they
// remain visible only as the Rejected Withdraw summary tile above); deposits,
// package purchases, referral commissions, and ad/task earnings have no
// place in this list at all. Sourced directly from the withdrawals
// collection (not the generic transactions ledger) since a ledger entry is
// only ever written at approval time — it structurally can't represent a
// still-pending request.
export function TransactionHistory() {
  const { withdrawals, loading, error, retry } = useWithdrawalHistory();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-white">Withdraw history</h2>
        <p className="text-xs text-white/50">Your pending and approved withdrawal requests.</p>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && withdrawals.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <ArrowUpFromLine className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No withdrawal requests yet.</p>
        </div>
      )}

      {!loading && !error && withdrawals.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/10">
          {withdrawals.map((withdrawal, index) => (
            <li key={`${withdrawal.uid}-${index}-${withdrawal.createdAt?.toMillis?.() ?? index}`} className="py-3 first:pt-0 last:pb-0">
              <HistoryListRow
                title={`Withdrawal to ${withdrawal.accountNumber}`}
                subtitle={`${formatDate(withdrawal.createdAt)} · ${WITHDRAWAL_SOURCE_WALLET_LABELS[withdrawal.sourceWallet]}`}
                amount={withdrawal.amount}
                direction="out"
                status={withdrawal.status}
                statusClassName={STATUS_STYLES[withdrawal.status]}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
