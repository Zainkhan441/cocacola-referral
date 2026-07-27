"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { submitDepositRequest } from "@/features/wallet/lib/actions";
import { validateReferenceId, validateSenderAccountNumber } from "@/features/wallet/lib/validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { EasypaisaPaymentDetails } from "@/features/payments/components/easypaisa-payment-details";
import { usePaymentScreenshotUpload } from "@/features/payments/hooks/use-payment-screenshot-upload";
import { formatCurrency } from "@/lib/format";
import type { PackageDoc } from "@/lib/firestore/packages";

type PackagePurchaseFormProps = {
  pkg: PackageDoc;
  onDone: () => void;
  onCancel: () => void;
};

type FieldErrors = {
  referenceId?: string;
  senderAccountNumber?: string;
};

// Amount is never free-text here — it's always exactly the selected
// package's price, submitted read-only. This is the one place a
// package-purchase deposit is created; the dashboard's generic deposit
// form is top-up-only, so there's only ever one path that can tag a
// deposit with a packageId. Renders as a modal — the popup a package click
// opens on /packages.
export function PackagePurchaseForm({ pkg, onDone, onCancel }: PackagePurchaseFormProps) {
  const { user } = useAuth();

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

    const errors: FieldErrors = {
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
        amount: pkg.price,
        referenceId: referenceId.trim(),
        senderAccountNumber: senderAccountNumber.trim(),
        screenshotUrl,
        packageId: pkg.id,
      });
      setSuccess(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onCancel} title={`Purchase "${pkg.name}"`}>
      {success ? (
        <div className="flex flex-col gap-4">
          <Alert variant="success">
            Purchase request for &quot;{pkg.name}&quot; submitted. We’ll review it shortly and
            activate your package once approved.
          </Alert>
          <Button variant="outline" size="md" onClick={onDone} className="self-start">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Selected package</h3>
            <p className="text-lg font-bold text-white">{formatCurrency(pkg.price)}</p>
          </div>

          {formError && <Alert variant="error">{formError}</Alert>}

          <EasypaisaPaymentDetails />

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

          <div className="flex gap-3">
            <Button type="submit" size="md" disabled={submitting}>
              {submitting ? <Spinner /> : `Submit Payment · ${formatCurrency(pkg.price)}`}
            </Button>
            <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
