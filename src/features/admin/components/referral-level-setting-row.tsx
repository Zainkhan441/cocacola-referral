"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { updateReferralLevelSettingAction } from "@/features/admin/lib/referral-settings-actions";
import { validateRewardValue } from "@/features/admin/lib/referral-settings-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { RewardType } from "@/lib/firestore/referral-settings";
import type { LevelSettingRow } from "@/features/admin/hooks/use-admin-referral-settings";

type ReferralLevelSettingRowProps = {
  row: LevelSettingRow;
};

export function ReferralLevelSettingRow({ row }: ReferralLevelSettingRowProps) {
  const { user } = useAuth();

  const [rewardType, setRewardType] = useState<RewardType>(row.rewardType);
  const [rewardValue, setRewardValue] = useState(String(row.rewardValue));
  const [enabled, setEnabled] = useState(row.enabled);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isDirty =
    rewardType !== row.rewardType ||
    Number(rewardValue) !== row.rewardValue ||
    enabled !== row.enabled;

  async function handleSave() {
    if (!user || submitting) return;
    setFormError(null);
    setSaved(false);

    const parsedValue = Number(rewardValue);
    const error = validateRewardValue(parsedValue, rewardType);
    setFieldError(error);
    if (error) return;

    setSubmitting(true);
    try {
      await updateReferralLevelSettingAction(
        row.level,
        { rewardType, rewardValue: parsedValue, enabled },
        { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3 sm:w-32 sm:flex-shrink-0">
        <p className="font-semibold text-white">Level {row.level}</p>
        {row.isDefault && (
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
            Default
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={rewardType}
          onChange={(event) => setRewardType(event.target.value as RewardType)}
          className="rounded-xl border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed (Rs)</option>
        </select>

        <div className="flex flex-col gap-1">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={rewardType === "percentage" ? 100 : undefined}
            step="0.1"
            value={rewardValue}
            onChange={(event) => setRewardValue(event.target.value)}
            className="w-28 rounded-xl border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          />
          {fieldError && <p className="text-xs text-red-400">{fieldError}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand"
          />
          Enabled
        </label>
      </div>

      <div className="flex items-center gap-2">
        {formError && <Alert variant="error">{formError}</Alert>}
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={submitting || !isDirty}
        >
          {submitting ? <Spinner className="h-4 w-4" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
