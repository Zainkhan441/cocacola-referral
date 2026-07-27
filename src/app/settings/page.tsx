"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { useAppAccessGate } from "@/features/auth/hooks/use-app-access-gate";
import { logout } from "@/features/auth/lib/actions";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import { ProfileSection } from "@/features/settings/components/profile-section";
import { PasswordSection } from "@/features/settings/components/password-section";
import { PreferencesSection } from "@/features/settings/components/preferences-section";

export default function SettingsPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
  const { gateLoading } = useAppAccessGate({ configured, authLoading, user, profile, profileLoading });

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && profileLoading && (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        )}

        {!gateLoading && !profileLoading && profileError && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
            <Alert variant="error">{profileError}</Alert>
            <Button variant="outline" size="sm" onClick={retryProfile}>
              Retry
            </Button>
          </div>
        )}

        {!gateLoading && !profileLoading && !profileError && !profile && (
          <MissingProfileRecovery onRetry={retryProfile} />
        )}

        {!gateLoading && !profileLoading && !profileError && profile && (
          <>
            <div>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
              <p className="text-sm text-white/50">Manage your profile, security, and preferences.</p>
            </div>

            <ProfileSection profile={profile} />
            <PasswordSection />
            <PreferencesSection profile={profile} />

            <div className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold text-white">Account</h2>
              <Button variant="outline" size="md" onClick={handleLogout}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
