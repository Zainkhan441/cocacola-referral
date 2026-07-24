"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminBonusTiers } from "@/features/admin/hooks/use-admin-bonus-tiers";
import { BonusTierForm } from "@/features/admin/components/bonus-tier-form";
import { BonusTierList } from "@/features/admin/components/bonus-tier-list";
import type { BonusTierDoc } from "@/lib/firestore/bonus-tiers";

export default function AdminBonusTiersPage() {
  const { tiers, loading, error, retry } = useAdminBonusTiers();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<BonusTierDoc | null>(null);

  function openCreateForm() {
    setEditingTier(null);
    setFormOpen(true);
  }

  function openEditForm(tier: BonusTierDoc) {
    setEditingTier(tier);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingTier(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bonus tiers</h1>
          <p className="text-sm text-white/50">
            Salary / level bonus tiers. Nothing is seeded by default — configure real values here.
          </p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={openCreateForm}>
            New tier
          </Button>
        )}
      </div>

      {formOpen && (
        <BonusTierForm initialTier={editingTier ?? undefined} onDone={closeForm} onCancel={closeForm} />
      )}

      <BonusTierList tiers={tiers} loading={loading} error={error} retry={retry} onEdit={openEditForm} />
    </div>
  );
}
