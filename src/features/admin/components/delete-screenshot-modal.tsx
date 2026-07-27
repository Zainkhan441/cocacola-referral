"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { deleteDepositScreenshotAction } from "@/features/admin/lib/deposit-actions";
import { useAuth } from "@/features/auth/context/auth-provider";
import { formatBytes } from "@/lib/format";
import type { DepositStatus } from "@/lib/firestore/deposits";

type DeleteScreenshotModalProps = {
  depositId: string;
  depositStatus: DepositStatus;
  screenshotSizeBytes: number | null;
  onClose: () => void;
  onDeleted: () => void;
};

// The deposit record itself is never at risk here — this modal only ever
// clears the screenshot field (see deleteDepositScreenshotAction), but the
// warning is written to read as unambiguously permanent as a real delete,
// since there is genuinely no undo for the image itself once this succeeds.
export function DeleteScreenshotModal({
  depositId,
  depositStatus,
  screenshotSizeBytes,
  onClose,
  onDeleted,
}: DeleteScreenshotModalProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!user || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteDepositScreenshotAction(depositId, {
        adminUid: user.uid,
        adminName: user.displayName ?? user.email ?? "Admin",
      });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t delete this screenshot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Delete payment screenshot?">
      <div className="flex flex-col gap-4">
        {depositStatus === "pending" && (
          <Alert variant="error">
            This payment has not been fully processed yet. Are you sure you want to permanently
            remove its proof?
          </Alert>
        )}

        <Alert variant="error">
          Have you downloaded and securely saved this payment proof? This action will permanently
          delete the screenshot from the website and cannot be undone. The deposit record will
          remain.
        </Alert>

        {screenshotSizeBytes != null && (
          <p className="text-xs text-white/50">
            Screenshot size: <span className="text-white/70">{formatBytes(screenshotSizeBytes)}</span>
          </p>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button
            variant="destructive"
            size="md"
            disabled={submitting}
            onClick={() => void handleConfirm()}
          >
            {submitting ? <Spinner /> : "Yes, Permanently Delete Screenshot"}
          </Button>
          <Button variant="outline" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
