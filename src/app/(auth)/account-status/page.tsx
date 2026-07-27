"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { logout } from "@/features/auth/lib/actions";
import type { AccountStatus } from "@/lib/firestore/users";

const STATUS_COPY: Partial<Record<AccountStatus, { title: string; body: string }>> = {
  suspended: {
    title: "Your account is suspended",
    body: "An administrator has temporarily suspended your account. You can't sign in or use the app while suspended. Please contact support for details.",
  },
  archived: {
    title: "Your account is archived",
    body: "An administrator has archived your account. Your data is safe, but you can't use the app while it's archived. Please contact support if you believe this is a mistake.",
  },
  banned: {
    title: "Your account has been banned",
    body: "An administrator has banned this account. Please contact support for details.",
  },
};

// Reached only via useAppAccessGate's redirect for a signed-in, non-admin
// user whose accountStatus isn't "active" — this is the honest UX for a
// restriction that's actually enforced server-side (see firestore.rules
// isActiveAccount()), not the enforcement itself. If an admin restores the
// account elsewhere while this page is open, the next profile snapshot
// flips accountStatus back to "active" and this page immediately routes
// onward on its own.
export default function AccountStatusPage() {
  const { configured, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { profile, loading: profileLoading, error, retry } = useUserProfile();

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profileLoading || !profile) return;
    if (profile.role === "admin" || profile.accountStatus === "active") {
      router.replace("/dashboard");
    }
  }, [configured, authLoading, user, profile, profileLoading, router]);

  if (!configured) {
    return (
      <AuthCard title="Account status">
        <FirebaseSetupNotice />
      </AuthCard>
    );
  }

  if (authLoading || profileLoading || !profile || profile.accountStatus === "active") {
    return (
      <AuthCard title="Account status">
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6" />
        </div>
      </AuthCard>
    );
  }

  if (error) {
    return (
      <AuthCard title="Account status">
        <div className="flex flex-col items-center gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      </AuthCard>
    );
  }

  const copy = STATUS_COPY[profile.accountStatus] ?? {
    title: "Account unavailable",
    body: "Your account currently can't be used. Please contact support for details.",
  };

  return (
    <AuthCard title={copy.title} description={copy.body}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => {
          void logout();
          router.replace("/login");
        }}
      >
        Sign out
      </Button>
    </AuthCard>
  );
}
