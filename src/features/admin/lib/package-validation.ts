export function validatePackageName(value: string): string | null {
  if (!value.trim()) return "Package name is required.";
  if (value.trim().length < 2) return "That name looks too short.";
  return null;
}

export function validateNonNegativeAmount(value: number, label: string): string | null {
  if (!Number.isFinite(value) || value < 0) return `${label} must be a non-negative number.`;
  return null;
}

export function validateDurationDays(value: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return "Duration must be a whole number of days greater than 0.";
  }
  return null;
}

export function validateDailyTaskLimit(value: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return "Daily task limit must be a whole number, 0 or greater.";
  }
  return null;
}

// Parses the admin form's newline-separated textarea into a clean array —
// blank lines are dropped rather than treated as a validation error.
export function parseFeaturesInput(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
