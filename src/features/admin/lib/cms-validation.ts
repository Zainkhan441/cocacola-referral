// Only http/https URLs are ever accepted anywhere in the CMS (media URLs,
// button URLs, social/nav links) — this is what "safe URL handling" means
// here: rejecting `javascript:`, `data:`, and any other scheme that could
// execute code or otherwise misbehave when used as an href/src.
export function validateSafeUrl(value: string, label = "URL"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return `Enter a valid ${label.toLowerCase()}.`;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `${label} must start with http:// or https://.`;
  }
  return null;
}

// Same as validateSafeUrl but the field itself is optional (empty is fine).
export function validateOptionalSafeUrl(value: string, label = "URL"): string | null {
  if (!value.trim()) return null;
  return validateSafeUrl(value, label);
}

export function validateRequiredText(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Slug is required.";
  if (!SLUG_PATTERN.test(trimmed)) {
    return "Slug may only contain lowercase letters, numbers, and hyphens (e.g. about-us).";
  }
  return null;
}

export function validateDateRange(
  startDate: Date | null,
  endDate: Date | null,
): string | null {
  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    return "End date must be after the start date.";
  }
  return null;
}
