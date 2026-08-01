import type { TransactionWallet } from "@/lib/firestore/transactions";
import type { WithdrawalMethod, WithdrawalSourceWallet } from "@/lib/firestore/withdrawals";

// The single source of truth for human-readable wallet names — every place
// that shows which wallet a withdrawal/transaction touched (withdrawal
// review rows, the withdrawal approval engine, the Financial History
// ledger) reuses this instead of redeclaring its own copy.
export const WALLET_FIELD_LABELS: Record<TransactionWallet, string> = {
  // The old standalone top-up wallet — retired entirely (deposits only ever
  // happen as part of a package purchase now). Kept only as a historical
  // label for any pre-existing transaction/balance that predates the
  // retirement; never shown as an active, creatable wallet anywhere.
  walletBalance: "Legacy Wallet Balance",
  currentBalance: "Current Balance",
  cocaColaEarning: "Coca-Cola Earning",
  staffEarning: "Staff Earning",
};

export const WITHDRAWAL_SOURCE_WALLET_LABELS: Record<WithdrawalSourceWallet, string> = {
  current_balance: "Current Balance",
  coca_cola_earning: "Coca-Cola Earning",
};

export const WITHDRAWAL_METHOD_LABELS: Record<WithdrawalMethod, string> = {
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
};
