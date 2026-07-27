"use client";

import { useState } from "react";
import { Eye, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { downloadDataUrl } from "@/lib/download-data-url";
import { DeleteScreenshotModal } from "@/features/admin/components/delete-screenshot-modal";
import type { DepositWithId } from "@/features/admin/hooks/use-admin-deposits";

const CLEANUP_ESCALATION_MS = 24 * 60 * 60 * 1000;

type DepositScreenshotControlsProps = {
  deposit: DepositWithId;
  onChanged: () => void;
  // Set by a bulk-selection "quick review" action on the screenshot-
  // management dashboard — shows the image without needing a per-row click.
  // View-only, by design: nothing here can trigger a delete, bulk or
  // otherwise (see ScreenshotManagementPage's selection state).
  forceShowImage?: boolean;
};

// The single place View/Download/Delete Screenshot controls live — shared
// by the per-deposit review row and the admin screenshot-management
// dashboard's list, so the three states (available / deleted / never
// attached) only need to be handled correctly once.
export function DepositScreenshotControls({ deposit, onChanged, forceShowImage = false }: DepositScreenshotControlsProps) {
  const [showImage, setShowImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // One-time snapshot at mount, not re-read on every render — good enough
  // for an admin-facing "has it been 24h yet" nudge; reopening/refreshing
  // the page re-evaluates it fresh.
  const [now] = useState(() => Date.now());

  if (deposit.screenshotStatus === "deleted") {
    return (
      <p className="text-xs text-white/40">
        Payment screenshot was permanently deleted by admin
        {deposit.screenshotDeletedAt ? ` on ${formatDate(deposit.screenshotDeletedAt)}` : ""}.
      </p>
    );
  }

  if (deposit.screenshotStatus !== "available" || !deposit.screenshotUrl) {
    return null;
  }

  const screenshotUrl = deposit.screenshotUrl;

  function handleDownload() {
    const date = deposit.createdAt.toDate().toISOString().slice(0, 10);
    downloadDataUrl(screenshotUrl, `payment-proof-${deposit.id}-${date}`);
  }

  const isReviewed = deposit.status === "approved" || deposit.status === "rejected";
  // updatedAt is bumped to the exact review instant by approveDeposit/
  // rejectDeposit — a reliable "since review" anchor without needing a
  // separate reviewedAt field.
  const msSinceReview = now - deposit.updatedAt.toMillis();
  const isOverdueForCleanup = isReviewed && msSinceReview >= CLEANUP_ESCALATION_MS;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowImage((prev) => !prev)}>
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {showImage || forceShowImage ? "Hide Screenshot" : "View Screenshot"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download Screenshot
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete Screenshot Permanently
        </Button>
      </div>

      {isOverdueForCleanup ? (
        <Alert variant="error">
          This payment screenshot is no longer required. Please download and permanently delete it
          to save database storage.
        </Alert>
      ) : (
        isReviewed && (
          <Alert variant="info">
            Payment verified. Download and delete the screenshot to save database storage.
          </Alert>
        )
      )}

      {(showImage || forceShowImage) && (
        // eslint-disable-next-line @next/next/no-img-element -- a base64 data URL rendered inline, not a Next-optimizable local/remote asset
        <img
          src={screenshotUrl}
          alt="Payment proof screenshot"
          className="max-h-64 w-full rounded-xl border border-white/10 bg-black object-contain"
        />
      )}

      {showDeleteModal && (
        <DeleteScreenshotModal
          depositId={deposit.id}
          depositStatus={deposit.status}
          screenshotSizeBytes={deposit.screenshotSizeBytes}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setShowDeleteModal(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
