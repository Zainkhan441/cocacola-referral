"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { SelectField } from "@/components/ui/select-field";
import { FormField } from "@/components/ui/form-field";
import {
  adjustUserWalletAction,
  type AdjustableWalletField,
} from "@/features/admin/lib/wallet-adjustment-actions";
import type { Reviewer } from "@/features/admin/lib/require-db";

type WalletAdjustmentFormProps = {
  uid: string;
  userName: string;
  reviewer: () => Reviewer;
  onAdjusted: () => void;
};

const FIELD_OPTIONS: ReadonlyArray<{ label: string; value: AdjustableWalletField }> = [
  { label: "Current Balance", value: "currentBalance" },
  { label: "Coca-Cola Earning", value: "cocaColaEarning" },
];

export function WalletAdjustmentForm({ uid, userName, reviewer, onAdjusted }: WalletAdjustmentFormProps) {
  const [field, setField] = useState<AdjustableWalletField>("currentBalance");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    setError(null);
    setSuccess(false);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setBusy(true);
    try {
      const delta = direction === "increase" ? parsedAmount : -parsedAmount;
      await adjustUserWalletAction(uid, userName, field, delta, reviewer());
      setSuccess(true);
      setAmount("");
      onAdjusted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t adjust this wallet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">Adjust wallet</h2>
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Wallet updated.</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SelectField
          label="Wallet"
          value={field}
          onChange={(event) => setField(event.target.value as AdjustableWalletField)}
          className="sm:max-w-xs"
        >
          {FIELD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Direction"
          value={direction}
          onChange={(event) => setDirection(event.target.value as "increase" | "decrease")}
          className="sm:max-w-[10rem]"
        >
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
        </SelectField>

        <FormField
          label="Amount (Rs)"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="sm:max-w-[10rem]"
        />

        <Button size="md" disabled={busy} onClick={handleSubmit}>
          {busy ? <Spinner /> : "Apply"}
        </Button>
      </div>
    </div>
  );
}
