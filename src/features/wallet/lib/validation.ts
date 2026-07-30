// Fallbacks used only while settings/withdrawalRules hasn't been configured
// yet by an admin — see lib/firestore/settings.ts getWithdrawalRules.
export const DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW = 500;
// A Level NUMBER (1-12, resolved via src/lib/level.ts), never a raw
// referral count — the lowest, most permissive Level by default.
export const DEFAULT_COCA_COLA_REQUIRED_LEVEL = 1;
// Coca-Cola Earning withdrawals have a fixed minimum (only the required
// Level is admin-editable, per product decision).
export const COCA_COLA_MIN_WITHDRAW = 500;

// Pakistani mobile-wallet number, e.g. Easypaisa (03XXXXXXXXX).
const ACCOUNT_NUMBER_PATTERN = /^03\d{9}$/;

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
  minAmount: number,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount.";
  if (amount < minAmount) {
    return `Minimum withdrawal is Rs ${minAmount.toLocaleString()}.`;
  }
  if (amount > availableBalance) {
    return "Amount exceeds your available balance.";
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

// The Easypaisa number a deposit was sent FROM — same shape as
// validateAccountNumber, kept as a separate named function since it
// validates a conceptually distinct field (sender number vs. withdrawal
// destination account).
export function validateSenderAccountNumber(value: string): string | null {
  if (!value.trim()) return "Sender Easypaisa number is required.";
  if (!ACCOUNT_NUMBER_PATTERN.test(value.trim())) {
    return "Enter an 11-digit mobile wallet number (e.g. 03XXXXXXXXX).";
  }
  return null;
}
