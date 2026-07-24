import type { TransactionWallet } from "@/lib/firestore/transactions";
import type { WithdrawalSourceWallet } from "@/lib/firestore/withdrawals";

// The single source of truth for human-readable wallet names — every place
// that shows which wallet a withdrawal/transaction touched (withdrawal
// review rows, the withdrawal approval engine, the Financial History
// ledger) reuses this instead of redeclaring its own copy.
export const WALLET_FIELD_LABELS: Record<TransactionWallet, string> = {
  walletBalance: "Deposit Wallet",
  currentBalance: "Current Balance",
  cocaColaEarning: "Coca-Cola Earning",
  staffEarning: "Staff Earning",
};

export const WITHDRAWAL_SOURCE_WALLET_LABELS: Record<WithdrawalSourceWallet, string> = {
  current_balance: "Current Balance",
  coca_cola_earning: "Coca-Cola Earning",
};
