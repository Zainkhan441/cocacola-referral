"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { deleteUserPermanentlyAction } from "@/features/admin/lib/user-actions";

type DeleteUserModalProps = {
  uid: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onDeleted: () => void;
};

// The last, irreversible step. Requires typing DELETE (same pattern as
// permanent package deletion) since this removes the Firebase Auth account
// entirely — there is no Restore for this one, unlike Suspend/Archive.
export function DeleteUserModal({ uid, userName, userEmail, onClose, onDeleted }: DeleteUserModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    if (!canDelete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteUserPermanentlyAction(uid);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t permanently delete this account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`Permanently delete ${userName}?`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-surface-3 p-3 text-xs text-white/70">
          <p className="text-white/40">Name</p>
          <p className="text-right font-semibold text-white">{userName}</p>
          <p className="text-white/40">Email</p>
          <p className="text-right font-semibold text-white">{userEmail}</p>
        </div>

        <Alert variant="error">
          This removes the user&apos;s sign-in account and personal profile entirely — they can
          never sign in again, and this cannot be undone. Blocked automatically if a deposit,
          withdrawal, task submission, or bonus claim is still awaiting review for this user —
          resolve those first.
        </Alert>

        <ul className="flex flex-col gap-1.5 text-xs text-white/50">
          <li>• Removed: Firebase sign-in account, profile, wallet, notifications, referral code.</li>
          <li>
            • Preserved: every past transaction, deposit, withdrawal, task submission, bonus claim,
            and referral commission record — none of this is deleted or altered.
          </li>
        </ul>

        {error && <Alert variant="error">{error}</Alert>}

        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          Type DELETE to confirm
          <input
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-white/15 bg-surface-3 px-4 text-sm text-white placeholder:text-white/30 transition-colors focus:border-red-500 focus:outline-none"
            placeholder="DELETE"
          />
        </label>

        <div className="flex gap-3">
          <Button
            variant="destructive"
            size="md"
            disabled={!canDelete || submitting}
            onClick={() => void handleDelete()}
          >
            {submitting ? <Spinner /> : "Permanently delete"}
          </Button>
          <Button variant="outline" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
