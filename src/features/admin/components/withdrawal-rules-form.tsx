"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useWithdrawalRules } from "@/features/admin/hooks/use-withdrawal-rules";
import { updateWithdrawalRulesAction } from "@/features/admin/lib/withdrawal-rules-actions";
import {
  validateCurrentBalanceMinWithdraw,
  validateCocaColaRequiredLevel,
  parseCocaColaRequiredLevel,
} from "@/features/admin/lib/withdrawal-rules-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { LEVEL_THRESHOLDS, levelLabel, thresholdForLevel } from "@/lib/level";

const DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW = 500;
// The lowest, most permissive Level by default — a fresh, unconfigured
// platform shouldn't lock every user out of Coca-Cola Earning withdrawals.
const DEFAULT_COCA_COLA_REQUIRED_LEVEL = 1;

export function WithdrawalRulesForm() {
  const { user } = useAuth();
  const { rules, loading, error, retry } = useWithdrawalRules();

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
    <WithdrawalRulesFormFields
      key={rules ? "loaded" : "empty"}
      initial={rules}
      adminUid={user?.uid}
      adminName={user?.displayName ?? user?.email ?? "Admin"}
    />
  );
}

type WithdrawalRulesFormFieldsProps = {
  initial: ReturnType<typeof useWithdrawalRules>["rules"];
  adminUid: string | undefined;
  adminName: string;
};

type FieldErrors = {
  currentBalanceMinWithdraw?: string;
  cocaColaRequiredLevel?: string;
};

function WithdrawalRulesFormFields({ initial, adminUid, adminName }: WithdrawalRulesFormFieldsProps) {
  const [currentBalanceMinWithdraw, setCurrentBalanceMinWithdraw] = useState(
    String(initial?.currentBalanceMinWithdraw ?? DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW),
  );
  const [cocaColaRequiredLevel, setCocaColaRequiredLevel] = useState(
    initial?.cocaColaRequiredLevel === null
      ? "disabled"
      : String(initial?.cocaColaRequiredLevel ?? DEFAULT_COCA_COLA_REQUIRED_LEVEL),
  );

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !adminUid) return;
    setFormError(null);
    setSuccess(false);

    const errors: FieldErrors = {
      currentBalanceMinWithdraw: validateCurrentBalanceMinWithdraw(currentBalanceMinWithdraw) ?? undefined,
      cocaColaRequiredLevel: validateCocaColaRequiredLevel(cocaColaRequiredLevel) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await updateWithdrawalRulesAction(
        {
          currentBalanceMinWithdraw: Number(currentBalanceMinWithdraw.trim()),
          cocaColaRequiredLevel: parseCocaColaRequiredLevel(cocaColaRequiredLevel),
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
      <h2 className="text-sm font-semibold text-white">Withdraw rules</h2>
      <p className="text-sm text-white/50">
        Current Balance withdrawals require reaching the minimum amount below. Coca-Cola Earning
        withdrawals instead require the requester to reach the shared CocaCola Level selected
        below — the same 12-level system shown on the Staff Earning page, resolved to its real
        active-direct-referral threshold, never a separately-invented number.
      </p>

      {formError && <Alert variant="error">{formError}</Alert>}
      {success && <Alert variant="success">Saved.</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Current Balance minimum withdraw (Rs)"
          type="number"
          inputMode="decimal"
          value={currentBalanceMinWithdraw}
          onChange={(event) => setCurrentBalanceMinWithdraw(event.target.value)}
          error={fieldErrors.currentBalanceMinWithdraw}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/80">Coca-Cola Earning required Level</label>
          <select
            value={cocaColaRequiredLevel}
            onChange={(event) => setCocaColaRequiredLevel(event.target.value)}
            className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="disabled">Disabled — no withdrawal access</option>
            {LEVEL_THRESHOLDS.map((threshold, index) => (
              <option key={index} value={index + 1}>
                {levelLabel(index + 1)} — {threshold.toLocaleString()} active direct referrals
              </option>
            ))}
          </select>
          {fieldErrors.cocaColaRequiredLevel && (
            <p className="text-xs text-red-400">{fieldErrors.cocaColaRequiredLevel}</p>
          )}
          <p className="text-xs text-white/40">
            {cocaColaRequiredLevel === "disabled" ? (
              "Coca-Cola Earning withdrawals will be disabled for all users."
            ) : (
              <>
                Users must reach {levelLabel(Number(cocaColaRequiredLevel))}, which requires{" "}
                {thresholdForLevel(Number(cocaColaRequiredLevel)).toLocaleString()} active direct
                referrals.
              </>
            )}
          </p>
        </div>
      </div>

      <Button type="submit" size="md" disabled={submitting} className="self-start">
        {submitting ? <Spinner /> : "Save changes"}
      </Button>
    </form>
  );
}
