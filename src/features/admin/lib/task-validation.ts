import { validateSafeUrl } from "@/features/admin/lib/cms-validation";

export function validateTaskTitle(value: string): string | null {
  if (!value.trim()) return "Title is required.";
  if (value.trim().length < 2) return "That title looks too short.";
  return null;
}

export function validateTaskDescription(value: string): string | null {
  if (!value.trim()) return "Description is required.";
  return null;
}

export function validateTaskInstructions(value: string): string | null {
  if (!value.trim()) return "Instructions are required.";
  return null;
}

export function validateMinPackagePrice(value: number | null): string | null {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0) return "Minimum package price must be 0 or more.";
  return null;
}

export function validateDateRange(startDate: Date | null, endDate: Date | null): string | null {
  if (!startDate) return "Start date is required.";
  if (endDate && endDate.getTime() <= startDate.getTime()) {
    return "End date must be after the start date.";
  }
  return null;
}

// Any embeddable http(s) video URL is accepted — not restricted to a
// specific host. The player (video-task-player.tsx) picks the strongest
// available validation per platform at watch time (YouTube's real "ended"
// event, or a time-based fallback for everything else), so the admin form
// only needs to guard against unsafe/malformed URLs, same as every other
// admin-authored link in this app.
export function validateVideoUrl(value: string): string | null {
  return validateSafeUrl(value, "Video URL");
}
