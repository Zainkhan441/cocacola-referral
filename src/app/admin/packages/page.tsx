"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useAdminPackages } from "@/features/admin/hooks/use-admin-packages";
import { PackageForm } from "@/features/admin/components/package-form";
import { PackageList } from "@/features/admin/components/package-list";
import type { PackageDoc } from "@/lib/firestore/packages";

const SUCCESS_MESSAGE_MS = 4000;

export default function AdminPackagesPage() {
  const { packages, loading, error, retry } = useAdminPackages();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageDoc | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_MS);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  function openCreateForm() {
    setEditingPackage(null);
    setFormOpen(true);
  }

  function openEditForm(pkg: PackageDoc) {
    setEditingPackage(pkg);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingPackage(null);
  }

  function handleFormDone() {
    setSuccessMessage(editingPackage ? "Package updated." : "Package created.");
    closeForm();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Packages</h1>
        {!formOpen && (
          <Button size="sm" onClick={openCreateForm}>
            New package
          </Button>
        )}
      </div>

      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {formOpen && (
        <PackageForm
          initialPackage={editingPackage ?? undefined}
          onDone={handleFormDone}
          onCancel={closeForm}
        />
      )}

      <PackageList
        packages={packages}
        loading={loading}
        error={error}
        retry={retry}
        onEdit={openEditForm}
        onActionSuccess={setSuccessMessage}
      />
    </div>
  );
}
