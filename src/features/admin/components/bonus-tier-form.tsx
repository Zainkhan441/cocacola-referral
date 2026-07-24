"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useAdminPackages } from "@/features/admin/hooks/use-admin-packages";
import { createBonusTierAction, updateBonusTierAction } from "@/features/admin/lib/bonus-actions";
import {
  validateBonusTierName,
  validateNonNegativeInteger,
  validateBonusAmount,
} from "@/features/admin/lib/bonus-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { BonusTierDoc, BonusTierInput, BonusRecurrence } from "@/lib/firestore/bonus-tiers";

type BonusTierFormProps = {
  initialTier?: BonusTierDoc;
  onDone: () => void;
  onCancel: () => void;
};

type FieldErrors = Partial<
  Record<"name" | "requiredDirectReferrals" | "requiredTotalTeam" | "requiredActiveTeam" | "bonusAmount", string>
>;

export function BonusTierForm({ initialTier, onDone, onCancel }: BonusTierFormProps) {
  const { user } = useAuth();
  const { packages } = useAdminPackages();
  const isEditing = Boolean(initialTier);

  const [name, setName] = useState(initialTier?.name ?? "");
  const [requiredDirectReferrals, setRequiredDirectReferrals] = useState(
    initialTier ? String(initialTier.requiredDirectReferrals) : "0",
  );
  const [requiredTotalTeam, setRequiredTotalTeam] = useState(
    initialTier ? String(initialTier.requiredTotalTeam) : "0",
  );
  const [requiredActiveTeam, setRequiredActiveTeam] = useState(
    initialTier ? String(initialTier.requiredActiveTeam) : "0",
  );
  const [requiredPackageId, setRequiredPackageId] = useState(initialTier?.requiredPackageId ?? "");
  const [bonusAmount, setBonusAmount] = useState(initialTier ? String(initialTier.bonusAmount) : "");
  const [recurrence, setRecurrence] = useState<BonusRecurrence>(initialTier?.recurrence ?? "one_time");
  const [isActive, setIsActive] = useState(initialTier?.isActive ?? true);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const input: BonusTierInput = {
      name: name.trim(),
      requiredDirectReferrals: Number(requiredDirectReferrals),
      requiredTotalTeam: Number(requiredTotalTeam),
      requiredActiveTeam: Number(requiredActiveTeam),
      requiredPackageId: requiredPackageId || null,
      bonusAmount: Number(bonusAmount),
      recurrence,
      isActive,
    };

    const errors: FieldErrors = {
      name: validateBonusTierName(input.name) ?? undefined,
      requiredDirectReferrals:
        validateNonNegativeInteger(input.requiredDirectReferrals, "Direct referrals") ?? undefined,
      requiredTotalTeam: validateNonNegativeInteger(input.requiredTotalTeam, "Total team") ?? undefined,
      requiredActiveTeam: validateNonNegativeInteger(input.requiredActiveTeam, "Active team") ?? undefined,
      bonusAmount: validateBonusAmount(input.bonusAmount) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initialTier) {
        await updateBonusTierAction(initialTier.id, input, reviewer);
      } else {
        await createBonusTierAction(input, reviewer);
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
        {isEditing ? `Edit "${initialTier?.name}"` : "Create a new bonus tier"}
      </h2>

      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Tier name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Required direct referrals"
          type="number"
          inputMode="numeric"
          step={1}
          value={requiredDirectReferrals}
          onChange={(event) => setRequiredDirectReferrals(event.target.value)}
          error={fieldErrors.requiredDirectReferrals}
        />
        <FormField
          label="Required total team"
          type="number"
          inputMode="numeric"
          step={1}
          value={requiredTotalTeam}
          onChange={(event) => setRequiredTotalTeam(event.target.value)}
          error={fieldErrors.requiredTotalTeam}
        />
        <FormField
          label="Required active team"
          type="number"
          inputMode="numeric"
          step={1}
          value={requiredActiveTeam}
          onChange={(event) => setRequiredActiveTeam(event.target.value)}
          error={fieldErrors.requiredActiveTeam}
        />
        <FormField
          label="Bonus amount (Rs)"
          type="number"
          inputMode="decimal"
          value={bonusAmount}
          onChange={(event) => setBonusAmount(event.target.value)}
          error={fieldErrors.bonusAmount}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/80">Required package (optional)</label>
          <select
            value={requiredPackageId}
            onChange={(event) => setRequiredPackageId(event.target.value)}
            className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="">Any package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/80">Recurrence</label>
          <select
            value={recurrence}
            onChange={(event) => setRecurrence(event.target.value as BonusRecurrence)}
            className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="one_time">One-time</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand"
        />
        Active (visible to users)
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create tier"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
