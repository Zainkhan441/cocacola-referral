"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { setAccountStatusAction } from "@/features/admin/lib/user-actions";
import type { AccountStatus } from "@/lib/firestore/users";
import type { Reviewer } from "@/features/admin/lib/require-db";

export const STATUS_BADGE_STYLES: Record<AccountStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  suspended: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  archived: "border-white/15 bg-white/5 text-white/50",
  banned: "border-red-500/30 bg-red-500/10 text-red-300",
};

type UserStatusActionsProps = {
  uid: string;
  userName: string;
  accountStatus: AccountStatus;
  reviewer: () => Reviewer;
  onChanged: () => void;
};

// Suspend/Archive are both a step an admin should confirm before taking
// (they immediately block the account) — Unsuspend/Restore are purely
// restorative, so they act immediately without a confirmation modal, same
// convention as package "Enable" vs "Disable" in package-list.tsx.
export function UserStatusActions({ uid, userName, accountStatus, reviewer, onChanged }: UserStatusActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<"suspended" | "archived" | null>(null);

  async function applyStatus(status: AccountStatus) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await setAccountStatusAction(uid, userName, status, reviewer());
      setConfirmTarget(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t update this account's status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {accountStatus === "active" && (
          <>
            <Button variant="warning" size="sm" disabled={busy} onClick={() => setConfirmTarget("suspended")}>
              Suspend account
            </Button>
            <Button variant="warning" size="sm" disabled={busy} onClick={() => setConfirmTarget("archived")}>
              Archive account
            </Button>
          </>
        )}
        {accountStatus === "suspended" && (
          <>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void applyStatus("active")}>
              {busy ? <Spinner /> : "Unsuspend account"}
            </Button>
            <Button variant="warning" size="sm" disabled={busy} onClick={() => setConfirmTarget("archived")}>
              Archive account
            </Button>
          </>
        )}
        {accountStatus === "archived" && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void applyStatus("active")}>
            {busy ? <Spinner /> : "Restore account"}
          </Button>
        )}
        {accountStatus === "banned" && (
          <p className="self-center text-xs text-white/40">
            This account is banned. Contact a developer to lift a ban — it&apos;s not exposed here.
          </p>
        )}
      </div>

      {confirmTarget && (
        <Modal
          onClose={() => setConfirmTarget(null)}
          title={confirmTarget === "suspended" ? `Suspend ${userName}?` : `Archive ${userName}?`}
        >
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2 text-sm text-white/70">
              <li>
                • {userName} will be immediately signed out of every page and blocked from depositing,
                withdrawing, submitting tasks, or claiming daily earnings.
              </li>
              {confirmTarget === "archived" && (
                <li>• This account will be hidden from the default Users list until restored.</li>
              )}
              <li>
                • This is fully reversible — you can {confirmTarget === "suspended" ? "Unsuspend" : "Restore"} this
                account at any time. No data is changed or removed.
              </li>
            </ul>
            <div className="flex gap-3">
              <Button
                variant="warning"
                size="md"
                disabled={busy}
                onClick={() => void applyStatus(confirmTarget)}
              >
                {busy ? <Spinner /> : confirmTarget === "suspended" ? "Suspend account" : "Archive account"}
              </Button>
              <Button variant="outline" size="md" onClick={() => setConfirmTarget(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
