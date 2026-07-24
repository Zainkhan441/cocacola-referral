"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { approveBonusClaim, rejectBonusClaim } from "@/features/admin/lib/bonus-actions";
import type { BonusClaimStatus } from "@/lib/firestore/bonus-claims";
import type { BonusClaimWithId } from "@/features/admin/hooks/use-admin-bonus-claims";

const STATUS_STYLES: Record<BonusClaimStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
};

type BonusClaimReviewRowProps = {
  claim: BonusClaimWithId;
  onReviewed: () => void;
};

export function BonusClaimReviewRow({ claim, onReviewed }: BonusClaimReviewRowProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleApprove() {
    if (!user || busy) return;
    setBusy(true);
    setRowError(null);
    try {
      await approveBonusClaim(claim.id, reviewer());
      onReviewed();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Couldn’t approve this claim.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!user || busy) return;
    setBusy(true);
    setRowError(null);
    try {
      await rejectBonusClaim(claim.id, reviewer());
      onReviewed();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Couldn’t reject this claim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-white">{claim.userName}</p>
          <p className="text-xs text-white/50">
            {claim.tierName} · {formatDate(claim.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-bold text-white">{formatCurrency(claim.bonusAmount)}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[claim.status]}`}
          >
            {claim.status}
          </span>
        </div>
      </div>

      <p className="text-xs text-white/50">
        At claim time: {claim.directReferralsAtClaim} direct · {claim.totalTeamAtClaim} total team ·{" "}
        {claim.activeTeamAtClaim} active team
      </p>

      {rowError && <Alert variant="error">{rowError}</Alert>}

      {claim.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={handleApprove}>
            Approve
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={handleReject}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
