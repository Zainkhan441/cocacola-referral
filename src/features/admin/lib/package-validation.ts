// Every numeric field arrives from a text input as a raw string — parsing
// happens here, inside validation, so an empty string or a non-numeric
// string (e.g. "12abc") is caught explicitly rather than silently becoming
// 0 or NaN via a bare Number(...) call before validation ever runs.
function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function validatePackageName(value: string): string | null {
  if (!value.trim()) return "Package name is required.";
  if (value.trim().length < 2) return "That name looks too short.";
  return null;
}

// Price must be strictly greater than 0 — distinct from the other amount
// fields below, which are allowed to be 0 (e.g. a package with no referral
// commission).
export function validatePackagePrice(raw: string): string | null {
  const value = parseNumericInput(raw);
  if (value == null) return "Price must be a valid number.";
  if (value <= 0) return "Price must be greater than 0.";
  return null;
}

export function validateNonNegativeAmount(raw: string, label: string): string | null {
  const value = parseNumericInput(raw);
  if (value == null) return `${label} must be a valid number.`;
  if (value < 0) return `${label} must be a non-negative number.`;
  return null;
}

export function validateDailyTaskLimit(raw: string): string | null {
  const value = parseNumericInput(raw);
  if (value == null) return "Daily task limit must be a valid number.";
  if (!Number.isInteger(value) || value < 0) {
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
