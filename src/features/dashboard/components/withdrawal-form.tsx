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
import { submitWithdrawalRequest } from "@/features/wallet/lib/actions";
import {
  validateWithdrawalAmount,
  validateAccountName,
  validateAccountNumber,
  WITHDRAWAL_MIN_AMOUNT,
} from "@/features/wallet/lib/validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { formatCurrency } from "@/lib/format";
import type { UserDoc } from "@/lib/firestore/users";

type WithdrawalFormProps = {
  profile: UserDoc;
};

type FieldErrors = {
  amount?: string;
  accountName?: string;
  accountNumber?: string;
};

export function WithdrawalForm({ profile }: WithdrawalFormProps) {
  const { user } = useAuth();
  const {
    packageInfo,
    loading: limitsLoading,
    error: limitsError,
    retry: retryLimits,
  } = usePackageLimits(profile.package);

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // A one-time snapshot at mount, not re-read on every render — the actual
  // enforcement is server-side (firestore.rules), this is just UI gating.
  const [now] = useState(() => Date.now());
  const maxPerRequest = packageInfo?.withdrawalLimitPerRequest ?? null;
  const packageExpired = Boolean(
    profile.package && (!profile.packageExpiresAt || now >= profile.packageExpiresAt.toMillis()),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;

    setFormError(null);
    setSuccess(false);

    const parsedAmount = Number(amount);
    const errors: FieldErrors = {
      amount:
        validateWithdrawalAmount(parsedAmount, profile.walletBalance, maxPerRequest) ??
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
        <h2 className="text-sm font-semibold text-white">Request a withdrawal</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          Easypaisa
        </span>
      </div>

      {profile.package == null && (
        <Alert variant="info">
          You need an active package to request a withdrawal. Visit the
          Packages page to purchase one.
        </Alert>
      )}

      {profile.package != null && packageExpired && (
        <Alert variant="info">
          Your package has expired. Renew it from the Packages page to
          request withdrawals again.
        </Alert>
      )}

      {profile.package != null && !packageExpired && limitsLoading && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Spinner className="h-4 w-4" />
          Checking your package limits…
        </div>
      )}

      {profile.package != null && !packageExpired && !limitsLoading && limitsError && (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{limitsError}</Alert>
          <Button variant="outline" size="sm" onClick={retryLimits} className="self-start">
            Retry
          </Button>
        </div>
      )}

      {profile.package != null && !packageExpired && !limitsLoading && !limitsError && !packageInfo && (
        <Alert variant="error">
          Your package configuration couldn’t be found. Please contact support.
        </Alert>
      )}

      {profile.package != null && !packageExpired && !limitsLoading && !limitsError && packageInfo && (
        <>
          <p className="text-xs text-white/50">
            Up to {formatCurrency(maxPerRequest ?? 0)} per withdrawal with your{" "}
            <span className="text-white/80">{packageInfo.name}</span> package.
            Available balance: {formatCurrency(profile.walletBalance)}.
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
              min={WITHDRAWAL_MIN_AMOUNT}
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
