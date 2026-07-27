"use client";

import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { submitDepositRequest } from "@/features/wallet/lib/actions";
import {
  validateDepositAmount,
  validateReferenceId,
  validateSenderAccountNumber,
  DEPOSIT_MIN_AMOUNT,
  DEPOSIT_MAX_AMOUNT,
} from "@/features/wallet/lib/validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { EasypaisaPaymentDetails } from "@/features/payments/components/easypaisa-payment-details";
import { usePaymentScreenshotUpload } from "@/features/payments/hooks/use-payment-screenshot-upload";

type FieldErrors = {
  amount?: string;
  referenceId?: string;
  senderAccountNumber?: string;
};

// Wallet top-ups only — package purchases are a distinct flow (see
// /packages and PackagePurchaseForm), which locks the amount to the
// selected package's exact price instead of leaving it free-text.
export function DepositForm() {
  const { user } = useAuth();

  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [senderAccountNumber, setSenderAccountNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const screenshot = usePaymentScreenshotUpload();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;

    setFormError(null);
    setSuccess(false);

    const parsedAmount = Number(amount);
    const errors: FieldErrors = {
      amount: validateDepositAmount(parsedAmount) ?? undefined,
      referenceId: validateReferenceId(referenceId) ?? undefined,
      senderAccountNumber: validateSenderAccountNumber(senderAccountNumber) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const screenshotUrl = await screenshot.upload(user.uid);
      await submitDepositRequest({
        uid: user.uid,
        userName: user.displayName ?? user.email ?? "Unknown",
        amount: parsedAmount,
        referenceId: referenceId.trim(),
        senderAccountNumber: senderAccountNumber.trim(),
        screenshotUrl,
        packageId: null,
      });
      setSuccess(true);
      setAmount("");
      setReferenceId("");
      setSenderAccountNumber("");
      screenshot.reset();
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
        <h2 className="text-sm font-semibold text-white">Request a deposit</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          Easypaisa
        </span>
      </div>

      <EasypaisaPaymentDetails />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {success && (
          <Alert variant="success">
            Deposit request submitted. We’ll review it shortly.
          </Alert>
        )}

        <FormField
          label="Amount (Rs)"
          type="number"
          inputMode="decimal"
          min={DEPOSIT_MIN_AMOUNT}
          max={DEPOSIT_MAX_AMOUNT}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={fieldErrors.amount}
        />
        <FormField
          label="Transaction / reference ID"
          type="text"
          value={referenceId}
          onChange={(event) => setReferenceId(event.target.value)}
          error={fieldErrors.referenceId}
        />
        <FormField
          label="Sender Easypaisa number"
          type="tel"
          placeholder="03XXXXXXXXX"
          value={senderAccountNumber}
          onChange={(event) => setSenderAccountNumber(event.target.value)}
          error={fieldErrors.senderAccountNumber}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/80">
            Payment proof screenshot (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={screenshot.handleFileChange}
            className="w-full rounded-xl border border-white/15 bg-surface-3 px-3 py-2.5 text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
          {screenshot.error && <p className="text-xs text-red-400">{screenshot.error}</p>}
          {screenshot.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local object-URL preview of a not-yet-uploaded file, not a Next-optimizable asset
            <img
              src={screenshot.previewUrl}
              alt="Screenshot preview"
              className="max-h-48 w-full rounded-xl border border-white/10 object-contain bg-black"
            />
          )}
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="mt-1">
          {submitting ? <Spinner /> : "Submit deposit request"}
        </Button>
      </form>
    </div>
  );
}

export function DepositFormSkeleton() {
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
