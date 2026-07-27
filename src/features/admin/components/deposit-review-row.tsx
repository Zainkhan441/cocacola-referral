"use client";

import { useEffect, useState } from "react";
import { getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/format";
import { db } from "@/lib/firebase/client";
import { referralRewardDocRef } from "@/lib/firestore/referral-rewards";
import { useAuth } from "@/features/auth/context/auth-provider";
import { approveDeposit, rejectDeposit } from "@/features/admin/lib/deposit-actions";
import type { DepositStatus } from "@/lib/firestore/deposits";
import type { DepositWithId } from "@/features/admin/hooks/use-admin-deposits";

const STATUS_STYLES: Record<DepositStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
};

type DepositReviewRowProps = {
  deposit: DepositWithId;
  onReviewed: () => void;
};

export function DepositReviewRow({ deposit, onReviewed }: DepositReviewRowProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  // Admin visibility only — whether the referral commission for THIS
  // specific approved purchase has already been paid (the
  // referralRewards/{depositId} doc is the idempotency record itself, so
  // its existence IS the answer). Never used to gate anything: duplicate
  // payment is already prevented server-side in approveDeposit regardless
  // of what this displays.
  const [commissionPaid, setCommissionPaid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!db || deposit.status !== "approved" || !deposit.packageId) return;
    let cancelled = false;
    getDoc(referralRewardDocRef(db, deposit.id))
      .then((snap) => {
        if (!cancelled) setCommissionPaid(snap.exists());
      })
      .catch(() => {
        if (!cancelled) setCommissionPaid(null);
      });
    return () => {
      cancelled = true;
    };
  }, [deposit.status, deposit.packageId, deposit.id]);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleApprove() {
    if (!user || busy) return;
    setBusy(true);
    setRowError(null);
    try {
      await approveDeposit(deposit.id, reviewer(), note);
      onReviewed();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Couldn’t approve this deposit.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!user || busy) return;
    setBusy(true);
    setRowError(null);
    try {
      await rejectDeposit(deposit.id, reviewer(), note);
      onReviewed();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Couldn’t reject this deposit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-white">{deposit.userName}</p>
          <p className="text-xs text-white/50">
            {formatDate(deposit.createdAt)} · Ref: {deposit.referenceId}
          </p>
          <p className="text-xs font-medium text-white/70">
            Sender Easypaisa number: <span className="tabular-nums text-white">{deposit.senderAccountNumber}</span>
          </p>
          {deposit.packageId && (
            <p className="text-xs font-medium text-brand-light">Package purchase request</p>
          )}
          {deposit.status === "approved" && deposit.packageId && commissionPaid != null && (
            <p className="text-xs text-white/40">
              Referral commission: {commissionPaid ? "paid" : "none (no referrer or Rs 0 commission)"}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-bold text-white">{formatCurrency(deposit.amount)}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[deposit.status]}`}
          >
            {deposit.status}
          </span>
        </div>
      </div>

      {deposit.screenshotUrl && (
        <a
          href={deposit.screenshotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl border border-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-facing proof preview from an arbitrary user-submitted URL, not a Next-optimizable local/remote asset */}
          <img
            src={deposit.screenshotUrl}
            alt="Payment proof screenshot"
            className="max-h-64 w-full object-contain bg-black"
          />
        </a>
      )}

      {deposit.reviewNote && (
        <p className="text-xs text-white/50">
          <span className="font-medium text-white/70">Review note:</span> {deposit.reviewNote}
        </p>
      )}

      {rowError && <Alert variant="error">{rowError}</Alert>}

      {deposit.status === "pending" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (optional) — shown to the user, e.g. a rejection reason"
            rows={2}
            className="w-full rounded-xl border border-white/15 bg-surface-3 px-3 py-2 text-xs text-white placeholder:text-white/30 transition-colors focus:border-brand focus:outline-none"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={handleApprove}>
              Approve
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={handleReject}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
