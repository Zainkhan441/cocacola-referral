"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminCmsPages } from "@/features/admin/hooks/use-admin-cms-pages";
import { CmsPageForm } from "@/features/admin/components/cms-page-form";
import { CmsPageList } from "@/features/admin/components/cms-page-list";
import type { CmsPageDoc } from "@/lib/firestore/cms-pages";

export default function AdminCmsPagesPage() {
  const { pages, loading, error, retry } = useAdminCmsPages();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CmsPageDoc | null>(null);

  function openCreateForm() {
    setEditingPage(null);
    setFormOpen(true);
  }

  function openEditForm(page: CmsPageDoc) {
    setEditingPage(page);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingPage(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom pages</h1>
          <p className="text-sm text-white/50">
            About Us, Contact Us, Privacy Policy, Terms, Promotions, News, Offers, or any custom page.
          </p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={openCreateForm}>
            New page
          </Button>
        )}
      </div>

      {formOpen && (
        <CmsPageForm initialPage={editingPage ?? undefined} onDone={closeForm} onCancel={closeForm} />
      )}

      <CmsPageList pages={pages} loading={loading} error={error} retry={retry} onEdit={openEditForm} />
    </div>
  );
}
