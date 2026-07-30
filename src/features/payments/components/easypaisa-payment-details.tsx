"use client";

import { useState } from "react";
import { Check, Copy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentSettings } from "@/features/payments/hooks/use-payment-settings";

// Shown only inside the package purchase form — the one place a deposit/
// payment account number ever appears to a user (the old standalone
// top-up "Deposit Wallet" flow has been retired entirely). The actual
// account a user must pay into before submitting a reference ID and proof
// screenshot. Reads through usePaymentSettings, so an admin's saved change
// in Payment Settings appears here immediately on next load.
export function EasypaisaPaymentDetails() {
  const { accountTitle, accountNumber, loading } = usePaymentSettings();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand/40 bg-brand/10 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-light">
        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
        Pay to this Easypaisa account
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{accountNumber}</p>
          <p className="text-sm text-white/60">{accountTitle}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-white/50">
        Complete this payment first, then submit the transaction/reference ID and proof screenshot
        below.
      </p>
    </div>
  );
}
