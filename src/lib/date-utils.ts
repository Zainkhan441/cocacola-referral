// Pakistan has used a single fixed UTC+5 offset year-round since 2009 (no
// DST) — so "is this a new Asia/Karachi calendar day" can be computed
// exactly by shifting both timestamps +5h and comparing their (still
// UTC-labeled, but now Pakistan-wall-clock) calendar date, with zero
// timezone-database dependency. firestore.rules' isNewPakistanDay() uses
// the identical shift-then-compare trick (timestamp + duration.value(5, "h")
// then .year()/.month()/.day()) — the two are bit-for-bit equivalent by
// construction, so client and rules can never disagree about a day
// boundary. This is the ONE shared day-boundary function for the whole
// daily task/ad reward system (rotation, completion, progress, claim).
const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000;

export function isNewPakistanDay(prevMs: number, nowMs: number): boolean {
  const prev = new Date(prevMs + PAKISTAN_OFFSET_MS);
  const now = new Date(nowMs + PAKISTAN_OFFSET_MS);
  return (
    now.getUTCFullYear() > prev.getUTCFullYear() ||
    (now.getUTCFullYear() === prev.getUTCFullYear() && now.getUTCMonth() > prev.getUTCMonth()) ||
    (now.getUTCFullYear() === prev.getUTCFullYear() &&
      now.getUTCMonth() === prev.getUTCMonth() &&
      now.getUTCDate() > prev.getUTCDate())
  );
}

// "YYYY-MM-DD" in Asia/Karachi (UTC+5) — the one shared date-key used for
// task rotation assignment, informational reward-date labels, and anywhere
// else "today" needs a stable, display-safe string. Never the actual
// security gate (isNewPakistanDay/the rules are), but always derived the
// same shift-then-format way so it can never disagree with them.
export function pakistanDateKey(ms: number): string {
  const shifted = new Date(ms + PAKISTAN_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The instant (ms since epoch) of the next Asia/Karachi midnight strictly
// after the given timestamp — used to render "next reset in" countdowns.
export function startOfNextPakistanDay(ms: number): number {
  const shifted = new Date(ms + PAKISTAN_OFFSET_MS);
  const nextMidnightShiftedUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1);
  return nextMidnightShiftedUtc - PAKISTAN_OFFSET_MS;
}

// The instant (ms since epoch) of the start of the given timestamp's own
// Asia/Karachi calendar day — the correct "since midnight" boundary for any
// admin reporting stat scoped to "today" (e.g. "Today's Earnings Paid"),
// matching the same Pakistan-day boundary every other daily feature in this
// app uses. Replaces a former startOfUtcDay() that reset at UTC midnight
// (5am Pakistan time) — a real inconsistency, since every other "today" in
// this app (task completion, daily claim, rotation) resets at Pakistan
// midnight, not UTC midnight.
export function startOfPakistanDay(ms: number): number {
  const shifted = new Date(ms + PAKISTAN_OFFSET_MS);
  const shiftedMidnightUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return shiftedMidnightUtc - PAKISTAN_OFFSET_MS;
}
