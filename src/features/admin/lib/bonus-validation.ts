export function validateBonusTierName(value: string): string | null {
  if (!value.trim()) return "Tier name is required.";
  if (value.trim().length < 2) return "That name looks too short.";
  return null;
}

export function validateNonNegativeInteger(value: number, label: string): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return `${label} must be a whole number of 0 or more.`;
  }
  return null;
}

export function validateBonusAmount(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return "Bonus amount must be greater than 0.";
  return null;
}
