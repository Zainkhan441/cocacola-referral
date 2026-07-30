"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { useAppAccessGate } from "@/features/auth/hooks/use-app-access-gate";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import { useTeamSummary } from "@/features/user/hooks/use-team-summary";
import { TeamSummaryCards } from "@/features/team/components/team-summary-cards";
import { TeamLevelBreakdown } from "@/features/team/components/team-level-breakdown";
import { TeamMemberList } from "@/features/team/components/team-member-list";
import { LevelProgressCard } from "@/features/team/components/level-progress-card";
import { LevelLadder } from "@/features/team/components/level-ladder";
import { StaffEarningSummaryCards } from "@/features/team/components/staff-earning-summary-cards";
import { DirectReferralList } from "@/features/team/components/direct-referral-list";
import { ReferralPanel } from "@/features/dashboard/components/referral-panel";
import { RecentReferralActivity } from "@/features/dashboard/components/recent-referral-activity";

export default function TeamPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
  const { summary, loading: summaryLoading, error: summaryError, retry: retrySummary } =
    useTeamSummary();
  const { gateLoading } = useAppAccessGate({ configured, authLoading, user, profile, profileLoading });

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

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && profileLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
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
                <Users className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Staff Earning</h1>
              </div>
              <p className="text-sm text-white/50">
                Your direct referrals, the commission they&apos;ve generated, and your Level progress.
                This page is a reporting view — Staff Earning is not a separate spendable wallet.
              </p>
              <p className="mt-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-medium text-brand-light">
                Referral commissions are credited to your Coca-Cola Earning.
              </p>
            </div>

            <LevelProgressCard />
            <StaffEarningSummaryCards />

            <div>
              <h2 className="text-sm font-semibold text-white">CocaCola Level System</h2>
              <p className="text-xs text-white/50">
                All 12 levels, based on your active direct referrals. Prize amounts are set by the
                admin and start at Rs 0 / inactive until configured.
              </p>
            </div>
            <LevelLadder summary={summary} summaryLoading={summaryLoading} />

            <ReferralPanel profile={profile} />
            <DirectReferralList />

            <div>
              <h2 className="text-sm font-semibold text-white">Referral earning history</h2>
              <p className="text-xs text-white/50">Who generated commission, which package, how much, and when.</p>
            </div>
            <RecentReferralActivity />

            <div className="flex flex-col gap-1 border-t border-white/10 pt-6">
              <h2 className="text-lg font-bold text-white">Full referral network</h2>
              <p className="text-sm text-white/50">
                Everyone in your 12-level referral network — for display only; commission is only
                ever paid on your direct (level 1) referrals above.
              </p>
            </div>

            <TeamSummaryCards
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
              retry={retrySummary}
            />
            <TeamLevelBreakdown summary={summary} loading={summaryLoading} />
            <TeamMemberList />
          </>
        )}
      </main>
    </div>
  );
}
