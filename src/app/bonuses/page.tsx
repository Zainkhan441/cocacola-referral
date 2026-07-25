"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { useTeamSummary } from "@/features/user/hooks/use-team-summary";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import { useBonusTiers } from "@/features/bonuses/hooks/use-bonus-tiers";
import { useMyBonusStatus } from "@/features/bonuses/hooks/use-my-bonus-status";
import { BonusTierCard } from "@/features/bonuses/components/bonus-tier-card";
import { BonusClaimHistory } from "@/features/bonuses/components/bonus-claim-history";
import { submitBonusClaim } from "@/features/bonuses/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

export default function BonusesPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
  const { summary, loading: summaryLoading, error: summaryError, retry: retrySummary } =
    useTeamSummary();
  const { tiers, loading: tiersLoading, error: tiersError, retry: retryTiers } = useBonusTiers();

  const activeTiers = useMemo(() => tiers.filter((tier) => tier.isActive), [tiers]);
  const tierIds = useMemo(() => activeTiers.map((tier) => tier.id), [activeTiers]);
  // Same underlying tier engine either way — "Salary" is just how a
  // recurring tier is framed, "Bonus" how a one_time tier is framed. Purely
  // a display split, not a second system.
  const salaryTiers = useMemo(
    () => activeTiers.filter((tier) => tier.recurrence === "recurring"),
    [activeTiers],
  );
  const oneTimeBonusTiers = useMemo(
    () => activeTiers.filter((tier) => tier.recurrence === "one_time"),
    [activeTiers],
  );
  const {
    awardedTierIds,
    pendingTierIds,
    loading: statusLoading,
    error: statusError,
    retry: retryStatus,
  } = useMyBonusStatus(tierIds);

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

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

  async function handleClaim(tierId: string) {
    if (!user || claimingId) return;
    setClaimError(null);
    setClaimSuccess(null);
    setClaimingId(tierId);
    try {
      await submitBonusClaim({
        uid: user.uid,
        userName: user.displayName ?? user.email ?? "Unknown",
        tierId,
      });
      setClaimSuccess("Bonus claim submitted. We’ll review it shortly.");
      retryStatus();
    } catch (error) {
      setClaimError(getAuthErrorMessage(error));
    } finally {
      setClaimingId(null);
    }
  }

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
              <Skeleton key={index} className="h-64 w-full rounded-2xl" />
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
                <Trophy className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Salary & level bonuses</h1>
              </div>
              <p className="text-sm text-white/50">
                Earn bonuses as your team grows. Eligibility is checked against your live team data.
              </p>
            </div>

            {summaryError && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{summaryError}</Alert>
                <Button variant="outline" size="sm" onClick={retrySummary}>
                  Retry
                </Button>
              </div>
            )}

            {statusError && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{statusError}</Alert>
                <Button variant="outline" size="sm" onClick={retryStatus}>
                  Retry
                </Button>
              </div>
            )}

            {claimError && <Alert variant="error">{claimError}</Alert>}
            {claimSuccess && <Alert variant="success">{claimSuccess}</Alert>}

            {(tiersLoading || summaryLoading || statusLoading) && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {!tiersLoading && tiersError && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{tiersError}</Alert>
                <Button variant="outline" size="sm" onClick={retryTiers}>
                  Retry
                </Button>
              </div>
            )}

            {!tiersLoading &&
              !tiersError &&
              !summaryLoading &&
              !statusLoading &&
              activeTiers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                  <p className="text-sm text-white/50">No bonus tiers are configured yet.</p>
                </div>
              )}

            {!tiersLoading && !tiersError && !summaryLoading && !statusLoading && salaryTiers.length > 0 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Salary</h2>
                  <p className="text-sm text-white/50">
                    Recurring income for maintaining your team size — claimable again each
                    time you re-qualify.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {salaryTiers.map((tier) => (
                    <BonusTierCard
                      key={tier.id}
                      tier={tier}
                      summary={summary}
                      packageId={profile.package}
                      awarded={awardedTierIds.has(tier.id)}
                      pending={pendingTierIds.has(tier.id)}
                      submitting={claimingId === tier.id}
                      onClaim={() => handleClaim(tier.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {!tiersLoading && !tiersError && !summaryLoading && !statusLoading && oneTimeBonusTiers.length > 0 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Bonuses</h2>
                  <p className="text-sm text-white/50">
                    One-time milestone rewards for reaching a team-size threshold.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {oneTimeBonusTiers.map((tier) => (
                    <BonusTierCard
                      key={tier.id}
                      tier={tier}
                      summary={summary}
                      packageId={profile.package}
                      awarded={awardedTierIds.has(tier.id)}
                      pending={pendingTierIds.has(tier.id)}
                      submitting={claimingId === tier.id}
                      onClaim={() => handleClaim(tier.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <BonusClaimHistory />
          </>
        )}
      </main>
    </div>
  );
}
