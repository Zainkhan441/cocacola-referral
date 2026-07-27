"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { usePaymentSettings } from "@/features/payments/hooks/use-payment-settings";
import { updatePaymentSettingsAction } from "@/features/admin/lib/payment-settings-actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

export function PaymentSettingsForm() {
  const { user } = useAuth();
  const { accountTitle, accountNumber, loading, error, retry } = usePaymentSettings();

  return loading ? (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : error ? (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
      <Alert variant="error">{error}</Alert>
      <Button variant="outline" size="sm" onClick={retry}>
        Retry
      </Button>
    </div>
  ) : (
    <PaymentSettingsFormFields
      key={`${accountTitle}-${accountNumber}`}
      initialAccountTitle={accountTitle}
      initialAccountNumber={accountNumber}
      adminUid={user?.uid}
      adminName={user?.displayName ?? user?.email ?? "Admin"}
    />
  );
}

type PaymentSettingsFormFieldsProps = {
  initialAccountTitle: string;
  initialAccountNumber: string;
  adminUid: string | undefined;
  adminName: string;
};

function PaymentSettingsFormFields({
  initialAccountTitle,
  initialAccountNumber,
  adminUid,
  adminName,
}: PaymentSettingsFormFieldsProps) {
  const [accountTitle, setAccountTitle] = useState(initialAccountTitle);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !adminUid) return;
    setFormError(null);
    setSuccess(false);

    setSubmitting(true);
    try {
      await updatePaymentSettingsAction(
        {
          accountTitle: accountTitle.trim(),
          accountNumber: accountNumber.trim(),
        },
        { adminUid, adminName },
      );
      setSuccess(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6"
    >
      <h2 className="text-sm font-semibold text-white">Easypaisa payment details</h2>
      <p className="text-xs text-white/50">
        Shown to every user on the Deposit form and the package purchase modal — this is the
        account they must pay into before submitting a transaction ID and proof screenshot.
        Changes here appear everywhere automatically.
      </p>

      {formError && <Alert variant="error">{formError}</Alert>}
      {success && <Alert variant="success">Saved.</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Easypaisa account title"
          type="text"
          value={accountTitle}
          onChange={(event) => setAccountTitle(event.target.value)}
        />
        <FormField
          label="Easypaisa account number"
          type="text"
          placeholder="03XXXXXXXXX"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
        />
      </div>

      <Button type="submit" size="md" disabled={submitting} className="self-start">
        {submitting ? <Spinner /> : "Save changes"}
      </Button>
    </form>
  );
}
