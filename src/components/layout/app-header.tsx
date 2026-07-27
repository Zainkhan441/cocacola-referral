"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { logout } from "@/features/auth/lib/actions";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { MoreMenu } from "@/components/layout/more-menu";

// Primary items: the pages a user is expected to visit daily/frequently —
// shown as direct pills. Everything else lives in the "More" menu so the
// primary row stays scannable at a glance rather than growing unbounded as
// pages are added; no page below became any less reachable, they just moved
// one tap deeper.
const PRIMARY_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/work-room", label: "Work Room" },
  { href: "/wallet", label: "Wallet" },
  { href: "/team", label: "Team" },
  { href: "/tasks", label: "Tasks" },
  { href: "/packages", label: "Packages" },
  { href: "/bonuses", label: "Bonuses" },
] as const;

const MORE_NAV_LINKS = [
  { href: "/channel", label: "Channel" },
  { href: "/guide", label: "Guide" },
  { href: "/settings", label: "Settings" },
] as const;

// The one shared header for every signed-in, non-admin page (dashboard,
// work room, wallet, team, tasks, packages, bonuses, channel, guide,
// settings, notifications) — replaces what used to be nine near-identical
// inline headers, each of which would otherwise need the same bell/links
// added by hand. Mirrors AdminShell's exact two-row structure (title bar +
// pill nav row) for visual consistency between the user and admin sides of
// the app.
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUserProfile();
  // A user with no approved package yet is confined to /packages only (see
  // useAppAccessGate) — the normal nav (and the notification bell, which
  // only ever leads to a page they can't reach) has nothing to show them.
  // Admins are exempt: they never own a package, so this must never lock
  // them out of their own nav (including the Admin panel link below).
  const locked = profile != null && profile.role !== "admin" && profile.package == null;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-2">
          {!locked && <NotificationBell />}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </Button>
        </div>
      </header>

      {!locked && (
        <nav
          className="flex items-center gap-1 overflow-x-auto border-b border-white/10 px-6 py-2 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] sm:[mask-image:none]"
        >
          {PRIMARY_NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <MoreMenu links={MORE_NAV_LINKS} pathname={pathname} />
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-brand text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              Admin panel
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
