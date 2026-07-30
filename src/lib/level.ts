// The ONE shared source of truth for the 12-level CocaCola Level System —
// every surface that shows or gates on "Level" (Staff Earning page, Bonus
// page, Dashboard, withdrawal Level gate, admin user details, admin Level
// management) must import from here, never re-implement the threshold
// table or the "which level am I at" arithmetic independently. Level is
// always derived from a user's ACTIVE direct referral count (direct +
// currently holding an approved package — see
// getDirectActiveReferralCount in team-members.ts), never from total
// registrations, pending, or rejected referrals.
export const LEVEL_THRESHOLDS: readonly number[] = [
  4, 12, 32, 58, 100, 170, 270, 350, 432, 500, 732, 1000,
];

export const LEVEL_COUNT = LEVEL_THRESHOLDS.length;

export function levelLabel(levelNumber: number): string {
  return `Level ${levelNumber}`;
}

// The single source of truth for "Level N requires how many active direct
// referrals" — the inverse of calculateLevel(). Every surface that needs to
// resolve an admin-selected Level (1-12) into its real referral threshold
// (e.g. the Coca-Cola Earning withdrawal gate) must call this, never keep a
// second copy of LEVEL_THRESHOLDS or hardcode "Level N = N referrals".
export function thresholdForLevel(levelNumber: number): number {
  const clamped = Math.min(Math.max(Math.round(levelNumber), 1), LEVEL_COUNT);
  return LEVEL_THRESHOLDS[clamped - 1];
}

export type LevelResult = {
  activeDirectReferrals: number;
  // null means "No Level" — fewer than LEVEL_THRESHOLDS[0] (4) active
  // direct referrals. Never shown as "Level 1" or "Level 0" in the UI.
  level: number | null;
  currentThreshold: number | null;
  nextLevel: number | null;
  nextThreshold: number | null;
  // How many more active direct referrals are needed to reach nextLevel —
  // null once already at the max level (12).
  referralsNeeded: number | null;
  // 0-100, progress from the current level's own threshold (or 0, while at
  // No Level) toward nextThreshold. 100 once the max level is reached.
  progressPercent: number;
};

// Pure, fully deterministic — trivially unit-testable and safe to call from
// both client components and one-off QA/migration scripts. Matches every
// boundary in the approved spec exactly: 3 referrals -> No Level, 4 -> Level
// 1, 11 -> Level 1, 12 -> Level 2, ..., 1000+ -> Level 12 (never higher,
// LEVEL_THRESHOLDS has no 13th entry).
export function calculateLevel(activeDirectReferrals: number): LevelResult {
  const count = Math.max(0, Math.floor(activeDirectReferrals));

  let levelIndex = -1; // -1 means "No Level"
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (count >= LEVEL_THRESHOLDS[i]) levelIndex = i;
    else break;
  }

  const level = levelIndex >= 0 ? levelIndex + 1 : null;
  const currentThreshold = levelIndex >= 0 ? LEVEL_THRESHOLDS[levelIndex] : null;
  const hasNextLevel = levelIndex + 1 < LEVEL_THRESHOLDS.length;
  const nextLevel = hasNextLevel ? levelIndex + 2 : null;
  const nextThreshold = hasNextLevel ? LEVEL_THRESHOLDS[levelIndex + 1] : null;
  const referralsNeeded = hasNextLevel ? Math.max(nextThreshold! - count, 0) : null;

  const baseline = currentThreshold ?? 0;
  const progressPercent = hasNextLevel
    ? Math.min(100, Math.max(0, ((count - baseline) / (nextThreshold! - baseline)) * 100))
    : 100;

  return {
    activeDirectReferrals: count,
    level,
    currentThreshold,
    nextLevel,
    nextThreshold,
    referralsNeeded,
    progressPercent,
  };
}
