"use client";

import { useState, type FormEvent } from "react";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { useWithdrawalEligibility } from "@/features/wallet/hooks/use-withdrawal-eligibility";
import { submitWithdrawalRequest } from "@/features/wallet/lib/actions";
import {
  validateWithdrawalAmount,
  validateAccountName,
  validateAccountNumber,
  COCA_COLA_MIN_WITHDRAW,
} from "@/features/wallet/lib/validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { formatCurrency } from "@/lib/format";
import type { UserDoc } from "@/lib/firestore/users";
import type { WithdrawalSourceWallet } from "@/lib/firestore/withdrawals";

type WithdrawalFormProps = {
  profile: UserDoc;
};

// Current Balance and Coca-Cola Earning each have their own independent
// withdraw flow — Staff Earning has no withdrawal path at all (admin can
// manually transfer it if needed). Current Balance is gated by an
// admin-editable minimum amount; Coca-Cola Earning is gated by the
// requester's own direct-active-referral Level reaching an admin-editable
// required Level (default 10) — that Level check is advisory-only here
// (Firestore rules can't run the aggregate query it needs), authoritatively
// re-verified server-side in approveWithdrawal before any money moves.
export function WithdrawalForm({ profile }: WithdrawalFormProps) {
  const { user } = useAuth();
  const {
    packageInfo,
    loading: limitsLoading,
    error: limitsError,
    retry: retryLimits,
  } = usePackageLimits(profile.package);
  const {
    currentBalanceMinWithdraw,
    cocaColaRequiredLevel,
    directActiveReferrals,
    loading: eligibilityLoading,
    error: eligibilityError,
    retry: retryEligibility,
  } = useWithdrawalEligibility(user?.uid ?? null);

  const [now] = useState(() => Date.now());
  const maxPerRequest = packageInfo?.withdrawalLimitPerRequest ?? null;
  const packageExpired = Boolean(
    profile.package && (!profile.packageExpiresAt || now >= profile.packageExpiresAt.toMillis()),
  );

  if (profile.package == null) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Withdraw</h2>
        <Alert variant="info">
          You need an active package to request a withdrawal. Visit the Packages page to purchase
          one.
        </Alert>
      </div>
    );
  }

  if (packageExpired) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Withdraw</h2>
        <Alert variant="info">
          Your package has expired. Renew it from the Packages page to request withdrawals again.
        </Alert>
      </div>
    );
  }

  if (limitsLoading || eligibilityLoading) {
    return <WithdrawalFormSkeleton />;
  }

  if (limitsError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{limitsError}</Alert>
        <Button variant="outline" size="sm" onClick={retryLimits}>
          Retry
        </Button>
      </div>
    );
  }

  if (eligibilityError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{eligibilityError}</Alert>
        <Button variant="outline" size="sm" onClick={retryEligibility}>
          Retry
        </Button>
      </div>
    );
  }

  if (!packageInfo) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <Alert variant="error">
          Your package configuration couldn’t be found. Please contact support.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SingleWithdrawalForm
        title="Withdraw Current Balance"
        sourceWallet="current_balance"
        availableBalance={profile.currentBalance}
        minAmount={currentBalanceMinWithdraw}
        maxPerRequest={maxPerRequest}
        blockedReason={
          profile.currentBalance < currentBalanceMinWithdraw
            ? `You need at least ${formatCurrency(currentBalanceMinWithdraw)} in Current Balance to withdraw.`
            : null
        }
      />
      <SingleWithdrawalForm
        title="Withdraw Coca-Cola Earning"
        sourceWallet="coca_cola_earning"
        availableBalance={profile.cocaColaEarning}
        minAmount={COCA_COLA_MIN_WITHDRAW}
        maxPerRequest={maxPerRequest}
        blockedReason={
          directActiveReferrals < cocaColaRequiredLevel
            ? `You need Level ${cocaColaRequiredLevel} (${cocaColaRequiredLevel} direct active referrals) to withdraw Coca-Cola Earning. You currently have ${directActiveReferrals}.`
            : null
        }
      />
    </div>
  );
}

type SingleWithdrawalFormProps = {
  title: string;
  sourceWallet: WithdrawalSourceWallet;
  availableBalance: number;
  minAmount: number;
  maxPerRequest: number | null;
  blockedReason: string | null;
};

type FieldErrors = {
  amount?: string;
  accountName?: string;
  accountNumber?: string;
};

function SingleWithdrawalForm({
  title,
  sourceWallet,
  availableBalance,
  minAmount,
  maxPerRequest,
  blockedReason,
}: SingleWithdrawalFormProps) {
  const { user } = useAuth();

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user || blockedReason) return;

    setFormError(null);
    setSuccess(false);

    const parsedAmount = Number(amount);
    const errors: FieldErrors = {
      amount:
        validateWithdrawalAmount(parsedAmount, availableBalance, maxPerRequest, minAmount) ??
        undefined,
      accountName: validateAccountName(accountName) ?? undefined,
      accountNumber: validateAccountNumber(accountNumber) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await submitWithdrawalRequest({
        uid: user.uid,
        userName: user.displayName ?? user.email ?? "Unknown",
        amount: parsedAmount,
        sourceWallet,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
      });
      setSuccess(true);
      setAmount("");
      setAccountName("");
      setAccountNumber("");
      setFieldErrors({});
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          Easypaisa
        </span>
      </div>

      {blockedReason ? (
        <Alert variant="info">{blockedReason}</Alert>
      ) : (
        <>
          <p className="text-xs text-white/50">
            {maxPerRequest != null && `Up to ${formatCurrency(maxPerRequest)} per withdrawal. `}
            Available balance: {formatCurrency(availableBalance)}.
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            {success && (
              <Alert variant="success">
                Withdrawal request submitted. We’ll review it shortly.
              </Alert>
            )}

            <FormField
              label="Amount (Rs)"
              type="number"
              inputMode="decimal"
              min={minAmount}
              max={maxPerRequest ?? undefined}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={fieldErrors.amount}
            />
            <FormField
              label="Account title"
              type="text"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              error={fieldErrors.accountName}
            />
            <FormField
              label="Account / wallet number"
              type="text"
              placeholder="03XXXXXXXXX"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              error={fieldErrors.accountNumber}
            />

            <Button type="submit" size="lg" disabled={submitting} className="mt-1">
              {submitting ? <Spinner /> : "Submit withdrawal request"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

export function WithdrawalFormSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
