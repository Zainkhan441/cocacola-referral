"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminPackages } from "@/features/admin/hooks/use-admin-packages";
import { PackageForm } from "@/features/admin/components/package-form";
import { PackageList } from "@/features/admin/components/package-list";
import type { PackageDoc } from "@/lib/firestore/packages";

export default function AdminPackagesPage() {
  const { packages, loading, error, retry } = useAdminPackages();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageDoc | null>(null);

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

      {formOpen && (
        <PackageForm
          initialPackage={editingPackage ?? undefined}
          onDone={closeForm}
          onCancel={closeForm}
        />
      )}

      <PackageList
        packages={packages}
        loading={loading}
        error={error}
        retry={retry}
        onEdit={openEditForm}
      />
    </div>
  );
}
