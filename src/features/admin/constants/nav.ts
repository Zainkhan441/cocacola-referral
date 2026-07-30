// The pages an admin is expected to visit daily/frequently — shown as
// direct pills. Everything else lives in the "More" menu so the primary row
// stays scannable at a glance instead of growing unbounded as sections are
// added; no page below became any less reachable, they just moved one tap
// deeper.
export const ADMIN_PRIMARY_NAV_LINKS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Deposits", href: "/admin/deposits" },
  { label: "Withdrawals", href: "/admin/withdrawals" },
] as const;

export const ADMIN_MORE_NAV_LINKS = [
  { label: "Packages", href: "/admin/packages" },
  { label: "Payment Settings", href: "/admin/payment-settings" },
  { label: "Financial History", href: "/admin/transactions" },
  { label: "Earnings", href: "/admin/earnings" },
  { label: "Referral Logs", href: "/admin/referral-logs" },
  { label: "Screenshot Management", href: "/admin/screenshot-management" },
  { label: "Tasks", href: "/admin/tasks" },
  { label: "Task Submissions (legacy)", href: "/admin/task-submissions" },
  { label: "Bonus Tiers", href: "/admin/bonus-tiers" },
  { label: "Bonus Claims", href: "/admin/bonus-claims" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Channel", href: "/admin/channel" },
  { label: "Pages", href: "/admin/website/pages" },
  { label: "Announcements", href: "/admin/website/announcements" },
  { label: "FAQ", href: "/admin/website/faq" },
  { label: "Guides", href: "/admin/website/guides" },
  { label: "Rules", href: "/admin/website/rules" },
  { label: "Navigation", href: "/admin/website/navigation" },
  { label: "Media", href: "/admin/website/media" },
  { label: "Activity", href: "/admin/activity" },
] as const;
