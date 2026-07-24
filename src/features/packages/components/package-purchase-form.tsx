"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { submitDepositRequest } from "@/features/wallet/lib/actions";
import { validateReferenceId, validateScreenshotUrl } from "@/features/wallet/lib/validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { formatCurrency } from "@/lib/format";
import type { PackageDoc } from "@/lib/firestore/packages";

type PackagePurchaseFormProps = {
  pkg: PackageDoc;
  onDone: () => void;
  onCancel: () => void;
};

type FieldErrors = {
  referenceId?: string;
  screenshotUrl?: string;
};

// Amount is never free-text here — it's always exactly the selected
// package's price, submitted read-only. This is the one place a
// package-purchase deposit is created; the dashboard's generic deposit
// form is top-up-only, so there's only ever one path that can tag a
// deposit with a packageId.
export function PackagePurchaseForm({ pkg, onDone, onCancel }: PackagePurchaseFormProps) {
  const { user } = useAuth();

  const [referenceId, setReferenceId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;

    setFormError(null);
    setSuccess(false);

    const errors: FieldErrors = {
      referenceId: validateReferenceId(referenceId) ?? undefined,
      screenshotUrl: validateScreenshotUrl(screenshotUrl) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await submitDepositRequest({
        uid: user.uid,
        userName: user.displayName ?? user.email ?? "Unknown",
        amount: pkg.price,
        referenceId: referenceId.trim(),
        screenshotUrl: screenshotUrl.trim() || null,
        packageId: pkg.id,
      });
      setSuccess(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-5">
        <Alert variant="success">
          Purchase request for &quot;{pkg.name}&quot; submitted. We’ll review it shortly and
          activate your package once approved.
        </Alert>
        <Button variant="outline" size="md" onClick={onDone} className="self-start">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Purchase &quot;{pkg.name}&quot;</h3>
        <p className="text-lg font-bold text-white">{formatCurrency(pkg.price)}</p>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Transaction / reference ID"
        type="text"
        value={referenceId}
        onChange={(event) => setReferenceId(event.target.value)}
        error={fieldErrors.referenceId}
      />
      <FormField
        label="Proof screenshot URL (optional)"
        type="url"
        value={screenshotUrl}
        onChange={(event) => setScreenshotUrl(event.target.value)}
        error={fieldErrors.screenshotUrl}
      />

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : `Pay ${formatCurrency(pkg.price)}`}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
