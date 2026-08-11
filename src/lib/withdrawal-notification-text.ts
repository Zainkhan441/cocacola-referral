// The single source of truth for what a withdrawal-status notification
// says to the USER — both when it's WRITTEN (see
// features/admin/lib/withdrawal-actions.ts, on approve/reject) and when
// it's DISPLAYED (see features/notifications/lib/withdrawal-notification-
// display.ts, which sanitizes older stored notifications through this
// same text). Deliberately contains no amount, source wallet, account
// number, or payment method: user notifications must never reveal
// financial details — only Withdrawal History (a separate,
// owner-authenticated view) shows exact amounts/status. Admin-facing
// activity-log entries are NOT user notifications and are unaffected by
// this — they still record full detail for audit purposes.
export type WithdrawalNotificationStatus = "approved" | "rejected" | "pending";

export const WITHDRAWAL_NOTIFICATION_TEXT: Record<
  WithdrawalNotificationStatus,
  { title: string; body: string }
> = {
  approved: {
    title: "Withdrawal approved",
    body: "Your withdrawal request has been approved.",
  },
  rejected: {
    title: "Withdrawal rejected",
    body: "Your withdrawal request has been rejected.",
  },
  // Not currently sent anywhere (submitWithdrawalRequest doesn't create a
  // notification today) — kept here so the display-side sanitizer in
  // withdrawal-notification-display.ts can recognize and safely render one
  // if that's ever added later, without a second place needing to agree on
  // the exact wording.
  pending: {
    title: "Withdrawal submitted",
    body: "Your withdrawal request has been submitted and is pending review.",
  },
};
