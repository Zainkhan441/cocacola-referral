"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { createPackageAction, updatePackageAction } from "@/features/admin/lib/package-actions";
import {
  validatePackageName,
  validateNonNegativeAmount,
  validateDurationDays,
  parseFeaturesInput,
} from "@/features/admin/lib/package-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { PackageDoc, PackageInput } from "@/lib/firestore/packages";

type PackageFormProps = {
  initialPackage?: PackageDoc;
  onDone: () => void;
  onCancel: () => void;
};

type FieldErrors = Partial<Record<keyof PackageInput, string>>;

export function PackageForm({ initialPackage, onDone, onCancel }: PackageFormProps) {
  const { user } = useAuth();
  const isEditing = Boolean(initialPackage);

  const [name, setName] = useState(initialPackage?.name ?? "");
  const [price, setPrice] = useState(initialPackage ? String(initialPackage.price) : "");
  const [dailyEarning, setDailyEarning] = useState(
    initialPackage ? String(initialPackage.dailyEarning) : "",
  );
  const [withdrawalLimitPerRequest, setWithdrawalLimitPerRequest] = useState(
    initialPackage ? String(initialPackage.withdrawalLimitPerRequest) : "",
  );
  const [dailyWithdrawalLimit, setDailyWithdrawalLimit] = useState(
    initialPackage ? String(initialPackage.dailyWithdrawalLimit) : "",
  );
  const [durationDays, setDurationDays] = useState(
    initialPackage ? String(initialPackage.durationDays) : "",
  );
  const [features, setFeatures] = useState(initialPackage?.features.join("\n") ?? "");
  const [isActive, setIsActive] = useState(initialPackage?.isActive ?? true);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const input: PackageInput = {
      name: name.trim(),
      price: Number(price),
      dailyEarning: Number(dailyEarning),
      withdrawalLimitPerRequest: Number(withdrawalLimitPerRequest),
      dailyWithdrawalLimit: Number(dailyWithdrawalLimit),
      durationDays: Number(durationDays),
      features: parseFeaturesInput(features),
      isActive,
    };

    const errors: FieldErrors = {
      name: validatePackageName(input.name) ?? undefined,
      price: validateNonNegativeAmount(input.price, "Price") ?? undefined,
      dailyEarning: validateNonNegativeAmount(input.dailyEarning, "Daily earning") ?? undefined,
      withdrawalLimitPerRequest:
        validateNonNegativeAmount(input.withdrawalLimitPerRequest, "Withdrawal limit") ?? undefined,
      dailyWithdrawalLimit:
        validateNonNegativeAmount(input.dailyWithdrawalLimit, "Daily withdrawal limit") ?? undefined,
      durationDays: validateDurationDays(input.durationDays) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initialPackage) {
        await updatePackageAction(initialPackage.id, input, reviewer);
      } else {
        await createPackageAction(input, reviewer);
      }
      onDone();
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
      <h2 className="text-sm font-semibold text-white">
        {isEditing ? `Edit "${initialPackage?.name}"` : "Create a new package"}
      </h2>

      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Package name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Price (Rs)"
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          error={fieldErrors.price}
        />
        <FormField
          label="Daily earning (Rs)"
          type="number"
          inputMode="decimal"
          value={dailyEarning}
          onChange={(event) => setDailyEarning(event.target.value)}
          error={fieldErrors.dailyEarning}
        />
        <FormField
          label="Withdrawal limit per request (Rs)"
          type="number"
          inputMode="decimal"
          value={withdrawalLimitPerRequest}
          onChange={(event) => setWithdrawalLimitPerRequest(event.target.value)}
          error={fieldErrors.withdrawalLimitPerRequest}
        />
        <FormField
          label="Daily withdrawal limit (Rs)"
          type="number"
          inputMode="decimal"
          value={dailyWithdrawalLimit}
          onChange={(event) => setDailyWithdrawalLimit(event.target.value)}
          error={fieldErrors.dailyWithdrawalLimit}
        />
        <FormField
          label="Duration (days)"
          type="number"
          inputMode="numeric"
          step={1}
          value={durationDays}
          onChange={(event) => setDurationDays(event.target.value)}
          error={fieldErrors.durationDays}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">
          Features (one per line)
        </label>
        <textarea
          value={features}
          onChange={(event) => setFeatures(event.target.value)}
          rows={4}
          placeholder={"Daily payouts\nInstant activation\nPriority support"}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/30 transition-colors focus:border-brand focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand"
        />
        Active (purchasable by users)
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create package"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
