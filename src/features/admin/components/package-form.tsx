"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/features/auth/context/auth-provider";
import { createPackageAction, updatePackageAction } from "@/features/admin/lib/package-actions";
import {
  validatePackageName,
  validatePackagePrice,
  validateNonNegativeAmount,
  validateDailyTaskLimit,
  parseFeaturesInput,
} from "@/features/admin/lib/package-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { formatCurrency } from "@/lib/format";
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
  const [referralCommission, setReferralCommission] = useState(
    initialPackage ? String(initialPackage.referralCommission) : "",
  );
  const [dailyTaskLimit, setDailyTaskLimit] = useState(
    initialPackage ? String(initialPackage.dailyTaskLimit) : "",
  );
  const [features, setFeatures] = useState(initialPackage?.features.join("\n") ?? "");
  const [isActive, setIsActive] = useState(initialPackage?.isActive ?? true);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Only used when editing an existing package — a new package has no
  // holders yet, so there's nothing "financially important" to confirm.
  const [pendingInput, setPendingInput] = useState<PackageInput | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const trimmedName = name.trim();
    const errors: FieldErrors = {
      name: validatePackageName(trimmedName) ?? undefined,
      price: validatePackagePrice(price) ?? undefined,
      dailyEarning: validateNonNegativeAmount(dailyEarning, "Daily earning") ?? undefined,
      referralCommission:
        validateNonNegativeAmount(referralCommission, "Referral commission") ?? undefined,
      dailyTaskLimit: validateDailyTaskLimit(dailyTaskLimit) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const input: PackageInput = {
      name: trimmedName,
      price: Number(price.trim()),
      dailyEarning: Number(dailyEarning.trim()),
      referralCommission: Number(referralCommission.trim()),
      dailyTaskLimit: Number(dailyTaskLimit.trim()),
      features: parseFeaturesInput(features),
      isActive,
    };

    if (initialPackage) {
      setPendingInput(input);
      return;
    }

    void saveInput(input);
  }

  async function saveInput(input: PackageInput) {
    if (!user) return;
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
      setPendingInput(null);
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
          label="Referral commission (Rs)"
          type="number"
          inputMode="decimal"
          value={referralCommission}
          onChange={(event) => setReferralCommission(event.target.value)}
          error={fieldErrors.referralCommission}
        />
        <FormField
          label="Daily task limit (tasks/day)"
          type="number"
          inputMode="numeric"
          step={1}
          value={dailyTaskLimit}
          onChange={(event) => setDailyTaskLimit(event.target.value)}
          error={fieldErrors.dailyTaskLimit}
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

      {pendingInput && (
        <Modal onClose={() => setPendingInput(null)} title="Confirm package changes">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-white/70">
              This updates the package template only. Existing holders keep the daily earning and
              daily task limit they were already approved under — this change applies to future
              purchases and, for existing holders, only the parts of the template that aren&apos;t
              snapshotted per-user (name, price, referral commission, active status).
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-surface-3 p-3 text-xs text-white/70">
              <p className="text-white/40">Price</p>
              <p className="text-right font-semibold text-white">{formatCurrency(pendingInput.price)}</p>
              <p className="text-white/40">Daily earning</p>
              <p className="text-right font-semibold text-white">
                {formatCurrency(pendingInput.dailyEarning)}
              </p>
              <p className="text-white/40">Referral commission</p>
              <p className="text-right font-semibold text-white">
                {formatCurrency(pendingInput.referralCommission)}
              </p>
              <p className="text-white/40">Daily task limit</p>
              <p className="text-right font-semibold text-white">{pendingInput.dailyTaskLimit}</p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                size="md"
                disabled={submitting}
                onClick={() => void saveInput(pendingInput)}
              >
                {submitting ? <Spinner /> : "Confirm and save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setPendingInput(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
}
