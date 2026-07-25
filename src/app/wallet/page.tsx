"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wallet as WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import {
  WalletSummary,
  WalletSummarySkeleton,
} from "@/features/dashboard/components/wallet-summary";
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
import { TransactionHistory } from "@/features/wallet/components/transaction-history";

// The wallet home: balances, deposit, withdraw, and both histories in one
// place — relocated here from the Dashboard (Milestone 20) purely to give
// the daily-use pages (Dashboard/Work Room/Team/Wallet) a clean, single
// responsibility each. Every component here is reused completely unchanged;
// none of the deposit/withdrawal business logic is touched by this move.
export default function WalletPage() {
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
            <div className="grid gap-6 lg:grid-cols-2">
              <DepositFormSkeleton />
              <WithdrawalFormSkeleton />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <DepositHistorySkeleton />
              <WithdrawalHistorySkeleton />
            </div>
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
              <p className="text-sm text-white/50">
                Your balances, deposits, and withdrawals in one place.
              </p>
            </div>

            <WalletSummary profile={profile} />

            <div className="grid gap-6 lg:grid-cols-2">
              <DepositForm />
              <WithdrawalForm profile={profile} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DepositHistory />
              <WithdrawalHistory />
            </div>

            <TransactionHistory />
          </>
        )}
      </main>
    </div>
  );
}
