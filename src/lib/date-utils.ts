// Mirrors firestore.rules `isNewUtcDay()` exactly — Firestore timestamps are
// always UTC, so this is also "server time" for the purposes of the daily
// package earning schedule. Used client-side so the automatic-credit effect
// and the countdown display agree with what the rules will actually allow,
// instead of drifting from it via a separate rolling-24h approximation.
export function isNewUtcDay(prevMs: number, nowMs: number): boolean {
  const prev = new Date(prevMs);
  const now = new Date(nowMs);
  return (
    now.getUTCFullYear() > prev.getUTCFullYear() ||
    (now.getUTCFullYear() === prev.getUTCFullYear() && now.getUTCMonth() > prev.getUTCMonth()) ||
    (now.getUTCFullYear() === prev.getUTCFullYear() &&
      now.getUTCMonth() === prev.getUTCMonth() &&
      now.getUTCDate() > prev.getUTCDate())
  );
}

// The instant (ms since epoch) of the next UTC midnight strictly after the
// given timestamp — used to render "next credit in" countdowns.
export function startOfNextUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

// The instant (ms since epoch) of the start of the given timestamp's own
// UTC calendar day — used to query "today so far" figures (e.g. the admin
// dashboard's Today's Earnings Paid) on the same UTC boundary the daily
// earning engine itself uses.
export function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
