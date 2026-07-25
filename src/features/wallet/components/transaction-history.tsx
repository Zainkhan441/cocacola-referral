"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useMyTransactionHistory } from "@/features/user/hooks/use-my-transaction-history";
import { HistoryListRow } from "@/features/dashboard/components/history-card";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { WALLET_FIELD_LABELS } from "@/lib/wallet-labels";
import type { TransactionTypeFilter } from "@/lib/firestore/transactions";

const TYPE_OPTIONS: ReadonlyArray<{ label: string; value: TransactionTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Deposits", value: "deposit" },
  { label: "Packages", value: "package_purchase" },
  { label: "Withdrawals", value: "withdrawal" },
  { label: "Referral", value: "referral_reward" },
  { label: "Daily earning", value: "daily_reward" },
  { label: "Tasks", value: "task_reward" },
  { label: "Bonuses", value: "bonus_reward" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
};

function directionFor(type: TransactionTypeFilter): "in" | "out" {
  return type === "withdrawal" ? "out" : "in";
}

// The Wallet page's complete, paginated Transaction History — every wallet
// movement the user has ever had, filterable by type, reusing the exact
// same read-only query/rules already governing the admin Financial History
// ledger (a signed-in user has always been allowed to read their own
// transactions/{id} docs). No new business logic — purely a new view.
export function TransactionHistory() {
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const { transactions, loading, loadingMore, error, hasMore, loadMore, retry } =
    useMyTransactionHistory(typeFilter);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-white">Transaction history</h2>
        <p className="text-xs text-white/50">Every wallet movement on your account.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTypeFilter(option.value)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              typeFilter === option.value
                ? "bg-brand text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            {option.label}
          </button>
        ))}
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

      {!loading && !error && transactions.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <Receipt className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">
            No {typeFilter === "all" ? "" : `${typeFilter.replace("_", " ")} `}transactions yet.
          </p>
        </div>
      )}

      {!loading && !error && transactions.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/10">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="py-3 first:pt-0 last:pb-0">
              <HistoryListRow
                title={transaction.description}
                subtitle={`${formatDate(transaction.createdAt)}${
                  transaction.wallet ? ` · ${WALLET_FIELD_LABELS[transaction.wallet]}` : ""
                }`}
                amount={transaction.amount}
                direction={directionFor(transaction.type)}
                status={transaction.status}
                statusClassName={STATUS_STYLES[transaction.status]}
              />
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && transactions.length > 0 && (
        <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
      )}
    </div>
  );
}
