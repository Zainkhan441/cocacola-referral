"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import {
  WalletSummary,
  WalletSummarySkeleton,
} from "@/features/dashboard/components/wallet-summary";
import {
  ReferralPanel,
  ReferralPanelSkeleton,
} from "@/features/dashboard/components/referral-panel";
import {
  RecentTransactions,
  RecentTransactionsSkeleton,
} from "@/features/dashboard/components/recent-transactions";
import {
  RecentReferralActivity,
  RecentReferralActivitySkeleton,
} from "@/features/dashboard/components/recent-referral-activity";
import {
  DepositForm,
  DepositFormSkeleton,
} from "@/features/dashboard/components/deposit-form";
import {
  WithdrawalForm,
  WithdrawalFormSkeleton,
} from "@/features/dashboard/components/withdrawal-form";
import {
  DepositHistory,
  DepositHistorySkeleton,
} from "@/features/dashboard/components/deposit-history";
import {
  WithdrawalHistory,
  WithdrawalHistorySkeleton,
} from "@/features/dashboard/components/withdrawal-history";
import {
  DailyClaimCard,
  DailyClaimCardSkeleton,
} from "@/features/dashboard/components/daily-claim-card";
import {
  ClaimHistory,
  ClaimHistorySkeleton,
} from "@/features/dashboard/components/claim-history";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import {
  PackageStatusCard,
  PackageStatusCardSkeleton,
} from "@/features/dashboard/components/package-status-card";

export default function DashboardPage() {
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
          <div className="flex flex-col gap-6">
            <WalletSummarySkeleton />
            <PackageStatusCardSkeleton />
            <ReferralPanelSkeleton />
            <DailyClaimCardSkeleton />
            <div className="grid gap-6 lg:grid-cols-2">
              <DepositFormSkeleton />
              <WithdrawalFormSkeleton />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <DepositHistorySkeleton />
              <WithdrawalHistorySkeleton />
              <ClaimHistorySkeleton />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <RecentTransactionsSkeleton />
              <RecentReferralActivitySkeleton />
            </div>
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

        {!gateLoading && !profileLoading && !profileError && profile && user && (
          <>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user.displayName ?? user.email}
            </h1>

            <WalletSummary profile={profile} />
            <PackageStatusCard profile={profile} />
            <ReferralPanel profile={profile} />
            <DailyClaimCard profile={profile} />

            <div className="grid gap-6 lg:grid-cols-2">
              <DepositForm />
              <WithdrawalForm profile={profile} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <DepositHistory />
              <WithdrawalHistory />
              <ClaimHistory />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <RecentTransactions />
              <RecentReferralActivity />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
