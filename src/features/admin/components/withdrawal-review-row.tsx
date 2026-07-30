"use client";

import { useEffect, useState } from "react";
import { getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/format";
import { db } from "@/lib/firebase/client";
import { userDocRef, type UserDoc } from "@/lib/firestore/users";
import { useAuth } from "@/features/auth/context/auth-provider";
import { approveWithdrawal, rejectWithdrawal } from "@/features/admin/lib/withdrawal-actions";
import { WITHDRAWAL_SOURCE_WALLET_LABELS as SOURCE_WALLET_LABELS } from "@/lib/wallet-labels";
import type { WithdrawalStatus } from "@/lib/firestore/withdrawals";
import type { WithdrawalWithId } from "@/features/admin/hooks/use-admin-withdrawals";

const STATUS_STYLES: Record<WithdrawalStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

type WithdrawalReviewRowProps = {
  withdrawal: WithdrawalWithId;
  onReviewed: () => void;
};

export function WithdrawalReviewRow({ withdrawal, onReviewed }: WithdrawalReviewRowProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  // The requester's LIVE balances at the moment this row is viewed — shown
  // so the admin can visually sanity-check sufficiency before approving.
  // Display only: approveWithdrawal independently re-reads the balance
  // inside its own transaction and is the real enforcement point.
  const [liveProfile, setLiveProfile] = useState<UserDoc | null>(null);

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    getDoc(userDocRef(db, withdrawal.uid))
      .then((snap) => {
        if (!cancelled) setLiveProfile(snap.exists() ? snap.data() : null);
      })
      .catch(() => {
        if (!cancelled) setLiveProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [withdrawal.uid]);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleApprove() {
    if (!user || busy) return;
    setBusy(true);
    setRowError(null);
    try {
      await approveWithdrawal(withdrawal.id, reviewer(), note);
      onReviewed();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Couldn’t approve this withdrawal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!user || busy) return;
    if (!note.trim()) {
      setRowError("A rejection reason is required.");
      return;
    }
    setBusy(true);
    setRowError(null);
    try {
      await rejectWithdrawal(withdrawal.id, reviewer(), note);
      onReviewed();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Couldn’t reject this withdrawal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-white">{withdrawal.userName}</p>
          <p className="text-xs text-white/40">UID: {withdrawal.uid}</p>
          <p className="text-xs text-white/50">
            {formatDate(withdrawal.createdAt)} · {withdrawal.accountName} · {withdrawal.accountNumber}
          </p>
          <p className="text-xs font-medium text-brand-light">
            From {SOURCE_WALLET_LABELS[withdrawal.sourceWallet]}
          </p>
          {liveProfile && (
            <p className="text-xs text-white/40">
              Live balances — Current Balance: {formatCurrency(liveProfile.currentBalance)} · Coca-Cola
              Earning: {formatCurrency(liveProfile.cocaColaEarning)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-bold text-white">{formatCurrency(withdrawal.amount)}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[withdrawal.status]}`}
          >
            {withdrawal.status}
          </span>
        </div>
      </div>

      {withdrawal.status !== "pending" && (
        <p className="text-xs text-white/40">
          Processed by {withdrawal.reviewedBy ?? "—"} on {formatDate(withdrawal.updatedAt)}
        </p>
      )}

      {withdrawal.reviewNote && (
        <p className="text-xs text-white/50">
          <span className="font-medium text-white/70">Review note:</span> {withdrawal.reviewNote}
        </p>
      )}

      {rowError && <Alert variant="error">{rowError}</Alert>}

      {withdrawal.status === "pending" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note — optional for approval, required if rejecting"
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
