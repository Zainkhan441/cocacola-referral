"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/features/auth/types";
import type { UserDoc } from "@/lib/firestore/users";

type UseAppAccessGateParams = {
  configured: boolean;
  authLoading: boolean;
  user: AppUser | null;
  profile: UserDoc | null;
  profileLoading: boolean;
};

type UseAppAccessGateResult = {
  gateLoading: boolean;
};

// Every full-app page (all of them except /packages itself) requires both a
// signed-in user AND an approved package. A user with no package assigned
// yet is "locked" — confined to /packages until an admin approves their
// purchase — regardless of how they arrive at a URL, not just via hidden
// nav links (see AppHeader for the nav-hiding half of this gate, and
// /packages for the auto-unlock redirect once a purchase is approved).
//
// A suspended/archived/banned account is blocked even more broadly — every
// page (including /packages) redirects to /account-status, checked BEFORE
// the package lock so a blocked user is never routed to /packages instead.
// This is the UI-level half only; the actual money-moving enforcement is
// server-side (see firestore.rules isActiveAccount()) — this gate is not
// the security boundary, just the honest UX for a real, already-enforced
// restriction.
//
// Admins are exempt from Locked Mode and the account-status block entirely
// — an admin account never purchases a package and is never suspended
// through this app's own UI, so gating on either would wrongly lock every
// admin out of their own panel. Role is checked first, before either gate.
//
// Absence of a profile (the rare interrupted-signup case) is deliberately
// NOT treated as locked here — that already has its own MissingProfileRecovery
// branch on every page, which must render instead of a redirect loop.
export function useAppAccessGate({
  configured,
  authLoading,
  user,
  profile,
  profileLoading,
}: UseAppAccessGateParams): UseAppAccessGateResult {
  const router = useRouter();
  const isAdmin = profile?.role === "admin";
  const accountBlocked = profile != null && !isAdmin && profile.accountStatus !== "active";

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profileLoading || !profile) return;
    if (profile.role !== "admin" && profile.accountStatus !== "active") {
      router.replace("/account-status");
      return;
    }
    if (profile.role !== "admin" && profile.package == null) {
      router.replace("/packages");
    }
  }, [configured, authLoading, user, profile, profileLoading, router]);

  const locked = profile != null && !isAdmin && !accountBlocked && profile.package == null;
  const gateLoading = authLoading || !user || profileLoading || locked || accountBlocked;

  return { gateLoading };
}
