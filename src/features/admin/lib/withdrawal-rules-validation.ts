// Every numeric field arrives from a text input as a raw string — parsing
// happens here, inside validation, so an empty string (or a non-numeric
// string) is caught explicitly rather than silently becoming 0 via a bare
// Number(...) call before validation ever runs. This matters more than
// usual for these two specific fields: an accidentally-cleared "minimum
// withdraw" or "required Level" field silently saving as 0 would instantly
// (and invisibly) waive the corresponding withdrawal restriction platform-wide.
function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function validateCurrentBalanceMinWithdraw(raw: string): string | null {
  const value = parseNumericInput(raw);
  if (value == null) return "Minimum withdraw amount must be a valid number.";
  if (value < 0) return "Minimum withdraw amount must be 0 or greater.";
  return null;
}

export function validateCocaColaRequiredLevel(raw: string): string | null {
  const value = parseNumericInput(raw);
  if (value == null) return "Required Level must be a valid number.";
  if (!Number.isInteger(value) || value < 0) {
    return "Required Level must be a whole number, 0 or greater.";
  }
  return null;
}
