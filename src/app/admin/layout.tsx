"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AccessDenied } from "@/features/admin/components/access-denied";
import { AdminShell } from "@/features/admin/components/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [configured, authLoading, user, router]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  if (authLoading || !user || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-6">
        <Alert variant="error">{profileError}</Alert>
        <Button variant="outline" size="sm" onClick={retryProfile}>
          Retry
        </Button>
      </div>
    );
  }

  // The client-side check below only decides what to *render* for UX
  // (redirect vs. Access Denied vs. the admin shell). It is never the
  // security boundary — every admin read/write is independently enforced by
  // Firestore rules checking the same role field server-side, so a user who
  // bypasses this layout entirely (devtools, direct API calls) still can't
  // read or write anything admin-only.
  if (!profile || profile.role !== "admin") {
    return <AccessDenied />;
  }

  return <AdminShell>{children}</AdminShell>;
}
