"use client";

import { useState } from "react";
import { Package as PackageIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { setPackageActiveAction, deletePackageAction } from "@/features/admin/lib/package-actions";
import type { PackageDoc } from "@/lib/firestore/packages";

type PackageListProps = {
  packages: PackageDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onEdit: (pkg: PackageDoc) => void;
  onActionSuccess: (message: string) => void;
};

export function PackageList({
  packages,
  loading,
  error,
  retry,
  onEdit,
  onActionSuccess,
}: PackageListProps) {
  const { user } = useAuth();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [disableTarget, setDisableTarget] = useState<PackageDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PackageDoc | null>(null);

  function reviewerFor() {
    if (!user) return null;
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleEnable(pkg: PackageDoc) {
    const reviewer = reviewerFor();
    if (!reviewer || togglingId) return;
    setListError(null);
    setTogglingId(pkg.id);
    try {
      await setPackageActiveAction(pkg.id, pkg.name, true, reviewer);
      onActionSuccess(`"${pkg.name}" enabled.`);
    } catch {
      setListError("Couldn’t update that package. Please try again.");
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDisable() {
    const reviewer = reviewerFor();
    if (!reviewer || !disableTarget || togglingId) return;
    setListError(null);
    setTogglingId(disableTarget.id);
    try {
      await setPackageActiveAction(disableTarget.id, disableTarget.name, false, reviewer);
      onActionSuccess(`"${disableTarget.name}" disabled.`);
      setDisableTarget(null);
    } catch {
      setListError("Couldn’t update that package. Please try again.");
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
        <PackageIcon className="h-6 w-6 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">No packages yet. Create the first one above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {listError && <Alert variant="error">{listError}</Alert>}
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-white">{pkg.name}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  pkg.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/50"
                }`}
              >
                {pkg.isActive ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-white/50">
              Price {formatCurrency(pkg.price)} · Daily earning {formatCurrency(pkg.dailyEarning)} ·
              Daily tasks {pkg.dailyTaskLimit} · Referral commission{" "}
              {formatCurrency(pkg.referralCommission)}
            </p>
            {pkg.features.length > 0 && (
              <p className="text-xs text-white/40">{pkg.features.join(" · ")}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onEdit(pkg)}>
              Edit
            </Button>
            {pkg.isActive ? (
              <Button
                variant="warning"
                size="sm"
                disabled={togglingId === pkg.id}
                onClick={() => setDisableTarget(pkg)}
              >
                {togglingId === pkg.id ? <Spinner /> : "Disable"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={togglingId === pkg.id}
                onClick={() => void handleEnable(pkg)}
              >
                {togglingId === pkg.id ? <Spinner /> : "Enable"}
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(pkg)}>
              Delete
            </Button>
          </div>
        </div>
      ))}

      {disableTarget && (
        <DisableConfirmModal
          pkg={disableTarget}
          submitting={togglingId === disableTarget.id}
          onConfirm={confirmDisable}
          onClose={() => setDisableTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          pkg={deleteTarget}
          onDeleted={() => {
            onActionSuccess(`"${deleteTarget.name}" permanently deleted.`);
            setDeleteTarget(null);
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

type DisableConfirmModalProps = {
  pkg: PackageDoc;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function DisableConfirmModal({ pkg, submitting, onConfirm, onClose }: DisableConfirmModalProps) {
  return (
    <Modal onClose={onClose} title={`Disable "${pkg.name}"?`}>
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 text-sm text-white/70">
          <li>• New users will no longer be able to purchase it.</li>
          <li>• Existing package holders will remain unaffected.</li>
        </ul>
        <p className="text-xs text-white/40">
          This is temporary — you can re-enable this package at any time from this same list.
        </p>
        <div className="flex gap-3">
          <Button variant="warning" size="md" disabled={submitting} onClick={onConfirm}>
            {submitting ? <Spinner /> : "Disable package"}
          </Button>
          <Button variant="outline" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type DeleteConfirmModalProps = {
  pkg: PackageDoc;
  onDeleted: () => void;
  onClose: () => void;
};

function DeleteConfirmModal({ pkg, onDeleted, onClose }: DeleteConfirmModalProps) {
  const { user } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    if (!user || !canDelete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await deletePackageAction(pkg.id, pkg.name, {
        adminUid: user.uid,
        adminName: user.displayName ?? user.email ?? "Admin",
      });
      onDeleted();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Couldn’t delete that package. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`Permanently delete "${pkg.name}"?`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-surface-3 p-3 text-xs text-white/70">
          <p className="text-white/40">Package</p>
          <p className="text-right font-semibold text-white">{pkg.name}</p>
          <p className="text-white/40">Price</p>
          <p className="text-right font-semibold text-white">{formatCurrency(pkg.price)}</p>
        </div>
        <Alert variant="error">
          This permanently removes the package. This cannot be undone. If any user is still
          assigned this package, or a deposit for it is still pending review, deletion will be
          blocked — disable it instead.
        </Alert>
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
