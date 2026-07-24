export const DEPOSIT_MIN_AMOUNT = 500;
export const DEPOSIT_MAX_AMOUNT = 100_000;
// Fallbacks used only while settings/withdrawalRules hasn't been configured
// yet by an admin — see lib/firestore/settings.ts getWithdrawalRules.
export const DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW = 500;
export const DEFAULT_COCA_COLA_REQUIRED_LEVEL = 10;
// Coca-Cola Earning withdrawals have a fixed minimum (only the required
// Level is admin-editable, per product decision).
export const COCA_COLA_MIN_WITHDRAW = 500;

// Pakistani mobile-wallet number, e.g. Easypaisa (03XXXXXXXXX).
const ACCOUNT_NUMBER_PATTERN = /^03\d{9}$/;

export function validateDepositAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount.";
  if (amount < DEPOSIT_MIN_AMOUNT) {
    return `Minimum deposit is Rs ${DEPOSIT_MIN_AMOUNT.toLocaleString()}.`;
  }
  if (amount > DEPOSIT_MAX_AMOUNT) {
    return `Maximum deposit is Rs ${DEPOSIT_MAX_AMOUNT.toLocaleString()}.`;
  }
  return null;
}

export function validateReferenceId(value: string): string | null {
  if (!value.trim()) return "Transaction/reference ID is required.";
  if (value.trim().length < 4) return "That reference ID looks too short.";
  return null;
}

export function validateScreenshotUrl(value: string): string | null {
  if (!value.trim()) return null;
  try {
    new URL(value.trim());
    return null;
  } catch {
    return "Enter a valid URL.";
  }
}

export function validateWithdrawalAmount(
  amount: number,
  availableBalance: number,
  maxPerRequest: number | null,
  minAmount: number,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount.";
  if (amount < minAmount) {
    return `Minimum withdrawal is Rs ${minAmount.toLocaleString()}.`;
  }
  if (amount > availableBalance) {
    return "Amount exceeds your available balance.";
  }
  if (maxPerRequest != null && amount > maxPerRequest) {
    return `Your package allows a maximum of Rs ${maxPerRequest.toLocaleString()} per withdrawal.`;
  }
  return null;
}

export function validateAccountName(value: string): string | null {
  if (!value.trim()) return "Account title is required.";
  if (value.trim().length < 2) return "That name looks too short.";
  return null;
}

export function validateAccountNumber(value: string): string | null {
  if (!value.trim()) return "Account number is required.";
  if (!ACCOUNT_NUMBER_PATTERN.test(value.trim())) {
    return "Enter an 11-digit mobile wallet number (e.g. 03XXXXXXXXX).";
  }
  return null;
}
