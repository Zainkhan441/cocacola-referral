"use client";

import { WithdrawalHistoryList } from "@/features/wallet/components/withdrawal-history-list";

// The Wallet page's withdrawal history section — every one of this
// account's own withdrawal requests, every status included (Pending/
// Success/Rejected), nothing else. A thin wrapper around the shared
// WithdrawalHistoryList — the exact same component and live listener the
// Dashboard's own Withdrawal History card uses — so the two never diverge
// into separately-maintained implementations. Deposits, package purchases,
// referral commissions, and ad/task earnings have no place in this list.
// Export name kept as TransactionHistory (not renamed) to avoid touching
// its only call site (wallet/page.tsx) beyond what this change requires.
export function TransactionHistory() {
  return <WithdrawalHistoryList title="Withdrawal history" />;
}
