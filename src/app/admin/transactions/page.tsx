"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTransactions } from "@/features/admin/hooks/use-admin-transactions";
import { StatusFilterTabs } from "@/features/admin/components/status-filter-tabs";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { HistoryListRow } from "@/features/dashboard/components/history-card";
import { WALLET_FIELD_LABELS } from "@/lib/wallet-labels";
import { formatDate } from "@/lib/format";
import type { TransactionTypeFilter } from "@/lib/firestore/transactions";

const TYPE_OPTIONS: ReadonlyArray<{ label: string; value: TransactionTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Deposits", value: "deposit" },
  { label: "Package purchases", value: "package_purchase" },
  { label: "Withdrawals", value: "withdrawal" },
  { label: "Referral commissions", value: "referral_reward" },
  { label: "Daily earnings", value: "daily_reward" },
  { label: "Task rewards", value: "task_reward" },
  { label: "Bonuses", value: "bonus_reward" },
  { label: "Admin adjustments", value: "admin_adjustment" },
];

// Outbound money (leaves the platform / leaves this user's wallet toward
// another) — every other type is inbound-or-neutral for display purposes.
// admin_adjustment can be either direction in reality, but its own
// description text already says "increased"/"decreased" so it's shown
// neutrally (no forced sign) here to avoid implying the wrong direction.
function directionFor(type: TransactionTypeFilter): "in" | "out" {
  return type === "withdrawal" ? "out" : "in";
}

const STATUS_BADGE = "border-white/15 bg-white/5 text-white/70";

export default function AdminTransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const { transactions, loading, loadingMore, error, hasMore, loadMore, retry } =
    useAdminTransactions(typeFilter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial History</h1>
        <p className="text-sm text-white/50">
          Every wallet movement the platform has ever recorded — deposits, package purchases,
          withdrawals, referral commissions, daily earnings, task rewards, bonuses, and manual
          admin adjustments.
        </p>
      </div>

      <StatusFilterTabs options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
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
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
          <ul className="flex flex-col divide-y divide-white/10">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="py-3 first:pt-0 last:pb-0">
                <HistoryListRow
                  title={`${transaction.userName} — ${transaction.description}`}
                  subtitle={`${formatDate(transaction.createdAt)}${
                    transaction.wallet ? ` · ${WALLET_FIELD_LABELS[transaction.wallet]}` : ""
                  }${transaction.referenceId ? ` · Ref: ${transaction.referenceId}` : ""}`}
                  amount={transaction.amount}
                  direction={directionFor(transaction.type)}
                  status={transaction.status}
                  statusClassName={STATUS_BADGE}
                />
              </li>
            ))}
          </ul>
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
