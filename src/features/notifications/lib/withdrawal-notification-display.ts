import type { NotificationKind, UserNotificationDoc } from "@/lib/firestore/user-notifications";
import { WITHDRAWAL_NOTIFICATION_TEXT } from "@/lib/withdrawal-notification-text";

// The notification bell and notifications page must show ONLY
// withdrawal-status notifications — every other kind (deposit, referral,
// task_submission, admin_adjustment, bonus, account_status, announcement)
// is filtered out of the user-facing UI here. This never deletes or
// modifies the underlying Firestore documents — they're simply excluded
// from what these two views render, so no production data is touched and
// nothing here needs a migration to be correct.
export function isVisibleUserNotification(notification: { kind: NotificationKind }): boolean {
  return notification.kind === "withdrawal";
}

// Withdrawal notifications written before this change have the exact
// amount, source wallet, and account number baked into their stored
// `body` (see the old text withdrawal-actions.ts used to write, prior to
// this change). Rather than migrate or delete that production data, every
// withdrawal notification is displayed through this fixed, amount-free
// text instead of whatever its own stored `body` says — applied
// identically whether the document is old or new. The original `title`
// ("Withdrawal approved" / "Withdrawal rejected") has always been generic
// and safe on its own, and is what this keys off to pick the right fixed
// message; it never inspects `body`, which is exactly the field that used
// to contain the sensitive detail.
export function sanitizeWithdrawalNotificationText<T extends { title: string }>(
  notification: T,
): { title: string; body: string } {
  const title = notification.title.toLowerCase();
  if (title.includes("approved")) return WITHDRAWAL_NOTIFICATION_TEXT.approved;
  if (title.includes("rejected")) return WITHDRAWAL_NOTIFICATION_TEXT.rejected;
  if (title.includes("pending") || title.includes("submitted")) return WITHDRAWAL_NOTIFICATION_TEXT.pending;
  // Defensive fallback only — every withdrawal notification this app has
  // ever created uses one of the titles above. Never falls through to
  // displaying the raw, possibly amount-containing stored text.
  return { title: "Withdrawal update", body: "Your withdrawal request status has been updated." };
}

// Filters to visible (withdrawal-only) notifications and rewrites each
// one's title/body through the sanitizer above, in one step — every
// consumer of "my notifications" gets an already-safe-to-render list, so
// a future third consumer can't forget to sanitize.
export function toVisibleSanitizedNotifications<T extends UserNotificationDoc & { id: string }>(
  notifications: T[],
): T[] {
  return notifications.filter(isVisibleUserNotification).map((notification) => ({
    ...notification,
    ...sanitizeWithdrawalNotificationText(notification),
  }));
}
