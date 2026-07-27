"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/features/auth/types";
import type { UserDoc } from "@/lib/firestore/users";

type UseAccountStatusGuardParams = {
  configured: boolean;
  authLoading: boolean;
  user: AppUser | null;
  profile: UserDoc | null;
  profileLoading: boolean;
};

type UseAccountStatusGuardResult = {
  blocked: boolean;
};

// The account-status half of app access control, factored out so it can be
// applied to EVERY page a signed-in user can reach — including /packages,
// which is otherwise exempt from useAppAccessGate's package-lock check (a
// suspended/archived user must never be able to use /packages either, since
// it's reachable directly by URL regardless of package status). Admins are
// exempt — see useAppAccessGate's own comment for why.
export function useAccountStatusGuard({
  configured,
  authLoading,
  user,
  profile,
  profileLoading,
}: UseAccountStatusGuardParams): UseAccountStatusGuardResult {
  const router = useRouter();
  const isAdmin = profile?.role === "admin";
  const blocked = profile != null && !isAdmin && profile.accountStatus !== "active";

  useEffect(() => {
    if (!configured || authLoading || !user || profileLoading || !profile) return;
    if (profile.role !== "admin" && profile.accountStatus !== "active") {
      router.replace("/account-status");
    }
  }, [configured, authLoading, user, profile, profileLoading, router]);

  return { blocked };
}
