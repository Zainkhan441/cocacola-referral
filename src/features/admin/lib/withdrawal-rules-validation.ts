export function validateCurrentBalanceMinWithdraw(value: number): string | null {
  if (!Number.isFinite(value) || value < 0) return "Minimum withdraw amount must be 0 or greater.";
  return null;
}

export function validateCocaColaRequiredLevel(value: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return "Required Level must be a whole number, 0 or greater.";
  }
  return null;
}
