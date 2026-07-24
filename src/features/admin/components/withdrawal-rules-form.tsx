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
} from "@/features/admin/lib/withdrawal-rules-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

const DEFAULT_CURRENT_BALANCE_MIN_WITHDRAW = 500;
const DEFAULT_COCA_COLA_REQUIRED_LEVEL = 10;

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
    String(initial?.cocaColaRequiredLevel ?? DEFAULT_COCA_COLA_REQUIRED_LEVEL),
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

    const parsedMinWithdraw = Number(currentBalanceMinWithdraw);
    const parsedRequiredLevel = Number(cocaColaRequiredLevel);

    const errors: FieldErrors = {
      currentBalanceMinWithdraw: validateCurrentBalanceMinWithdraw(parsedMinWithdraw) ?? undefined,
      cocaColaRequiredLevel: validateCocaColaRequiredLevel(parsedRequiredLevel) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await updateWithdrawalRulesAction(
        {
          currentBalanceMinWithdraw: parsedMinWithdraw,
          cocaColaRequiredLevel: parsedRequiredLevel,
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
        withdrawals instead require the requester&apos;s direct active-referral Level to reach the
        required Level below (Level N = N direct active referrals).
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
        <FormField
          label="Coca-Cola Earning required Level"
          type="number"
          inputMode="numeric"
          step={1}
          value={cocaColaRequiredLevel}
          onChange={(event) => setCocaColaRequiredLevel(event.target.value)}
          error={fieldErrors.cocaColaRequiredLevel}
        />
      </div>

      <Button type="submit" size="md" disabled={submitting} className="self-start">
        {submitting ? <Spinner /> : "Save changes"}
      </Button>
    </form>
  );
}
