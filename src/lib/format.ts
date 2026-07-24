import type { Timestamp } from "firebase/firestore";

// Accepts null/undefined as a final UI-layer safeguard — e.g. Firestore's
// sum() aggregate resolves to null (not 0) when zero documents match the
// query, which a real value of 0 is indistinguishable from for display
// purposes. The actual fix belongs at the data/query layer (see
// use-admin-stats.ts, getReferralEarningsTotal); this is a defensive
// backstop so a null slipping through anywhere never crashes rendering.
export function formatCurrency(amount: number | null | undefined): string {
  return `Rs ${(amount ?? 0).toLocaleString()}`;
}

export function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
