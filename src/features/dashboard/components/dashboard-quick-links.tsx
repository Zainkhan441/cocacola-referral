import Link from "next/link";
import { ArrowRight, ClipboardList, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type QuickLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const QUICK_LINKS: QuickLink[] = [
  {
    href: "/tasks",
    label: "Tasks",
    description: "Today's earning & tasks",
    icon: ClipboardList,
  },
  {
    href: "/wallet",
    label: "Wallet",
    description: "Deposit, withdraw & history",
    icon: Wallet,
  },
  {
    href: "/team",
    label: "Team",
    description: "Referrals & your Level",
    icon: Users,
  },
];

// The dashboard's "where do I go next" row — surfaces the three daily-use
// pages (Tasks, Wallet, Team) as one-tap shortcuts from Home, since the
// dashboard itself no longer embeds their full content (Milestone 20 UX
// cleanup). Work Room was retired and merged into Tasks — this card was
// repointed to /tasks rather than removed. Purely navigational; no data
// fetching, no business logic.
export function DashboardQuickLinks() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {QUICK_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 transition-colors hover:border-brand/40 hover:bg-surface-3 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-light">
              <link.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{link.label}</p>
              <p className="text-xs text-white/50">{link.description}</p>
            </div>
          </div>
          <ArrowRight
            className="h-4 w-4 flex-shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}
