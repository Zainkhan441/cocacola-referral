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

// Same date format as formatDate, plus a time-of-day component — used
// where the exact moment (not just the day) of an event matters, e.g. the
// Dashboard's Withdrawal History rows.
export function formatDateTime(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Human-readable byte size for the admin screenshot-management dashboard's
// storage total — this app's screenshots max out in the hundreds of KB, so
// only KB/MB precision matters; bytes/GB are never realistically shown.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

// Privacy-conscious display of a referred user's email in the Staff
// Earning referral list — keeps the first character and domain, masks the
// rest (e.g. "a***@example.com"), so a referrer can recognize who's who
// without seeing a downline member's full address.
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(localPart.length - 1, 3))}@${domain}`;
}
