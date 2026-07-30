// Same string-first parsing as withdrawal-rules-validation.ts — an
// accidentally-cleared field must be rejected explicitly, not silently
// saved as 0 (which would waive the reward for every task platform-wide).
function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function validateTaskRewardPerAd(raw: string): string | null {
  const value = parseNumericInput(raw);
  if (value == null) return "Task reward must be a valid number.";
  if (value <= 0) return "Task reward must be greater than 0.";
  return null;
}

export function validateMinimumWatchSeconds(raw: string): string | null {
  const value = parseNumericInput(raw);
  if (value == null) return "Minimum watch time must be a valid number.";
  if (value <= 0) return "Minimum watch time must be greater than 0.";
  if (!Number.isInteger(value)) return "Minimum watch time must be a whole number of seconds.";
  return null;
}
