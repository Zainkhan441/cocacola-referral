"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import { usePackagesCatalog } from "@/features/packages/hooks/use-packages-catalog";
import { PackageCard } from "@/features/packages/components/package-card";
import { PackagePurchaseForm } from "@/features/packages/components/package-purchase-form";
import { PackagePurchaseHistory } from "@/features/packages/components/package-purchase-history";
import type { PackageDoc } from "@/lib/firestore/packages";

export default function PackagesPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
  const {
    packages,
    loading: packagesLoading,
    error: packagesError,
    retry: retryPackages,
  } = usePackagesCatalog("all");

  const [selectedPackage, setSelectedPackage] = useState<PackageDoc | null>(null);

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
    }
  }, [configured, authLoading, user, router]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  const gateLoading = authLoading || !user || !user.emailVerified;

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && profileLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-80 w-full rounded-2xl" />
            ))}
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
                <Package className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Packages</h1>
              </div>
              <p className="text-sm text-white/50">
                Choose a package to start earning daily rewards and referral bonuses.
              </p>
            </div>

            {profile.pendingPackagePurchaseId && (
              <Alert variant="info">
                You have a package purchase awaiting review. You can select a new package once
                it’s been approved or rejected.
              </Alert>
            )}

            {packagesLoading && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-80 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {!packagesLoading && packagesError && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{packagesError}</Alert>
                <Button variant="outline" size="sm" onClick={retryPackages}>
                  Retry
                </Button>
              </div>
            )}

            {!packagesLoading && !packagesError && packages.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-sm text-white/50">No packages are available yet.</p>
              </div>
            )}

            {!packagesLoading && !packagesError && packages.length > 0 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    isCurrent={profile.package === pkg.id}
                    disabledReason={profile.pendingPackagePurchaseId ? "Purchase pending review" : null}
                    onSelect={() => setSelectedPackage(pkg)}
                  />
                ))}
              </div>
            )}

            {selectedPackage && (
              <PackagePurchaseForm
                pkg={selectedPackage}
                onDone={() => setSelectedPackage(null)}
                onCancel={() => setSelectedPackage(null)}
              />
            )}

            <PackagePurchaseHistory />
          </>
        )}
      </main>
    </div>
  );
}
