"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { logout } from "@/features/auth/lib/actions";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/packages", label: "Packages" },
  { href: "/team", label: "Team" },
  { href: "/tasks", label: "Tasks" },
  { href: "/bonuses", label: "Bonuses" },
  { href: "/channel", label: "Channel" },
  { href: "/guide", label: "Guide" },
  { href: "/settings", label: "Settings" },
] as const;

// The one shared header for every signed-in, non-admin page (dashboard,
// packages, team, tasks, bonuses, channel, guide, settings, notifications) —
// replaces what used to be nine near-identical inline headers, each of which
// would otherwise need the same bell/links added by hand. Mirrors
// AdminShell's exact two-row structure (title bar + pill nav row) for visual
// consistency between the user and admin sides of the app.
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUserProfile();

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
          <NotificationBell />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </Button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-6 py-2">
        {NAV_LINKS.map((link) => {
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
    </>
  );
}
