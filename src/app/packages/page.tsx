"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { useAccountStatusGuard } from "@/features/auth/hooks/use-account-status-guard";
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
  const [justUnlocked, setJustUnlocked] = useState(false);

  // /packages is the one page exempt from useAppAccessGate's package lock
  // (it's where a locked user is SENT), but it must still block a
  // suspended/archived/banned account — otherwise that restriction would
  // have a hole exactly where a blocked user is most likely to land.
  const { blocked: accountBlocked } = useAccountStatusGuard({
    configured,
    authLoading,
    user,
    profile,
    profileLoading,
  });

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Package selection is a one-time, first-login-only step. Once a
    // package is owned, this page is never revisitable — no browsing a
    // different package, no upgrades. A different package strictly
    // requires a new account (see firestore.rules' permanent one-package-
    // per-account lock on deposits/{id}).
    if (!profileLoading && profile && profile.role !== "admin" && profile.package != null) {
      router.replace("/dashboard");
    }
  }, [configured, authLoading, user, profile, profileLoading, router]);

  // Tracks whether this user arrived here locked (no package yet) so an
  // already-unlocked user browsing /packages to buy a second package never
  // gets swept into this — only the very first approval fires it. Live via
  // useUserProfile's onSnapshot listener, so no page refresh is needed: the
  // instant an admin approves the purchase, this fires and redirects.
  const wasLockedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!profile) return;
    if (wasLockedRef.current === null) {
      wasLockedRef.current = profile.package == null;
      return;
    }
    if (wasLockedRef.current && profile.package != null) {
      wasLockedRef.current = false;
      setJustUnlocked(true);
      const timeout = setTimeout(() => router.push("/dashboard"), 1800);
      return () => clearTimeout(timeout);
    }
  }, [profile, router]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  // Excludes the "justUnlocked" transition deliberately — that's the
  // legitimate "purchase just got approved while I was on this page" case,
  // which has its own success message + redirect timer below. This gate is
  // only for someone who ARRIVES at /packages already owning a package.
  const alreadyOwnsPackage = Boolean(
    profile && profile.role !== "admin" && profile.package != null && !justUnlocked,
  );
  const gateLoading = authLoading || !user || accountBlocked || (!profileLoading && alreadyOwnsPackage);

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && profileLoading && (
          <div className="flex flex-col items-center gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-80 w-full max-w-md rounded-2xl" />
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

            {justUnlocked && (
              <Alert variant="success">
                Package activated! Unlocking your account and redirecting to your dashboard…
              </Alert>
            )}

            {profile.pendingPackagePurchaseId ? (
              // Once a purchase request has been submitted, package
              // selection is over — no cards, no browsing, no "pick a
              // different one" option. Just a status message until an
              // admin approves or rejects it (rejection clears
              // pendingPackagePurchaseId, which brings the cards back).
              <Alert variant="info">
                Your package purchase is awaiting admin review. This page will unlock your
                dashboard automatically once it’s approved.
              </Alert>
            ) : (
              <>
                {packagesLoading && (
                  <div className="flex flex-col items-center gap-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-80 w-full max-w-md rounded-2xl" />
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
                  <div className="flex flex-col items-center gap-6">
                    {packages.map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        isCurrent={profile.package === pkg.id}
                        disabledReason={null}
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
              </>
            )}

            <PackagePurchaseHistory />
          </>
        )}
      </main>
    </div>
  );
}
