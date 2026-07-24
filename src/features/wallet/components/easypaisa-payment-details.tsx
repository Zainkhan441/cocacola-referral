"use client";

import { useState } from "react";
import { Check, Copy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useOfficialChannel } from "@/features/channel/hooks/use-official-channel";

// Shown above every deposit form (DepositForm, PackagePurchaseForm) — the
// actual account a user must pay into before submitting a reference ID and
// proof screenshot. Without this, a user has no way to know where to send
// money at all. Renders a graceful fallback (never a blank/broken form) if
// an admin hasn't configured it yet in Official Channel settings.
export function EasypaisaPaymentDetails() {
  const { channel, loading } = useOfficialChannel();
  const [copied, setCopied] = useState(false);

  async function handleCopy(accountNumber: string) {
    await navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  if (!channel?.easypaisaAccountNumber) {
    return (
      <Alert variant="info">
        Payment details haven’t been configured yet. Please contact support before sending any
        payment.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand/40 bg-brand/10 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-light">
        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
        Pay to this Easypaisa account
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{channel.easypaisaAccountNumber}</p>
          {channel.easypaisaAccountName && (
            <p className="text-sm text-white/60">{channel.easypaisaAccountName}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleCopy(channel.easypaisaAccountNumber as string)}
        >
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
