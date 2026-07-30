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

// The select's raw value is either the sentinel "disabled" or a Level
// number "1".."12" as a string — never a free-typed referral count.
export function validateCocaColaRequiredLevel(raw: string): string | null {
  if (raw === "disabled") return null;
  const value = parseNumericInput(raw);
  if (value == null || !Number.isInteger(value) || value < 1 || value > 12) {
    return "Select a valid Level (1-12) or Disabled.";
  }
  return null;
}

// Converts the select's raw string value into the stored shape (a Level
// number 1-12, or null for "disabled") — call only after
// validateCocaColaRequiredLevel has returned null.
export function parseCocaColaRequiredLevel(raw: string): number | null {
  if (raw === "disabled") return null;
  return Number(raw.trim());
}
