"use client";

import { Wallet as WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { useAppAccessGate } from "@/features/auth/hooks/use-app-access-gate";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import {
  WalletSummary,
  WalletSummarySkeleton,
} from "@/features/dashboard/components/wallet-summary";
import {
  WithdrawalForm,
  WithdrawalFormSkeleton,
} from "@/features/dashboard/components/withdrawal-form";
import { TransactionHistory } from "@/features/wallet/components/transaction-history";

// The wallet home: balances and the entire withdraw system in one place.
// The old standalone "Deposit Wallet" top-up feature has been retired
// entirely — a payment/deposit number is only ever shown as part of the
// one-time package purchase flow (see /packages), never here. Withdraw
// history below is exactly this account's own withdrawal requests
// (approved/pending/rejected) — deposits and other wallet movements have
// no place in this view anymore.
export default function WalletPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
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

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && profileLoading && (
          <div className="flex flex-col gap-6">
            <WalletSummarySkeleton />
            <WithdrawalFormSkeleton />
            <Skeleton className="h-72 w-full rounded-2xl" />
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
                <WalletIcon className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Wallet</h1>
              </div>
              <p className="text-sm text-white/50">Your balances and withdrawals in one place.</p>
            </div>

            <WalletSummary profile={profile} />

            <WithdrawalForm profile={profile} />

            <TransactionHistory />
          </>
        )}
      </main>
    </div>
  );
}
