"use client";

import { WithdrawalHistoryList, WithdrawalHistoryListSkeleton } from "@/features/wallet/components/withdrawal-history-list";

// The Dashboard's ONLY transactions-shaped section (replaces the old mixed
// "Recent transactions" feed, which mixed deposits/task rewards/daily
// rewards/referral earnings/admin adjustments in one list). A thin wrapper
// around the shared WithdrawalHistoryList — the exact same component and
// live listener the Wallet page's own withdrawal history uses (see
// transaction-history.tsx) — so both pages render identically and never
// diverge into two separately-maintained implementations. No claim,
// reward, wallet-balance, or transaction-creation logic is touched here;
// this only reads and displays existing withdrawals/{id} documents.
export function WithdrawalHistory() {
  return <WithdrawalHistoryList title="Withdrawal history" />;
}

export function WithdrawalHistorySkeleton() {
  return <WithdrawalHistoryListSkeleton titleWidth="w-40" />;
}
