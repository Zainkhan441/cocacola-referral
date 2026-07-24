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

export function validateRewardAmount(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return "Reward amount must be greater than 0.";
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

export function validateVideoUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Video URL is required.";
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    const isYoutube = host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com";
    const isTiktok = host === "tiktok.com" || host === "m.tiktok.com";
    if (!isYoutube && !isTiktok) {
      return "Video URL must be a YouTube or TikTok link.";
    }
  } catch {
    return "Enter a valid URL.";
  }
  return null;
}
