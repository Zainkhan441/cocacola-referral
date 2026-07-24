"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { db } from "@/lib/firebase/client";
import { getCmsPage } from "@/lib/firestore/cms-pages";
import { useAdminCmsSections } from "@/features/admin/hooks/use-admin-cms-sections";
import { CmsSectionForm } from "@/features/admin/components/cms-section-form";
import { CmsSectionList } from "@/features/admin/components/cms-section-list";
import type { CmsPageDoc } from "@/lib/firestore/cms-pages";
import type { CmsSectionDoc } from "@/lib/firestore/cms-sections";

type CmsPageEditorClientProps = {
  pageId: string;
};

export function CmsPageEditorClient({ pageId }: CmsPageEditorClientProps) {
  const [page, setPage] = useState<CmsPageDoc | null | undefined>(undefined);
  const { sections, loading, error, retry } = useAdminCmsSections(pageId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CmsSectionDoc | null>(null);

  useEffect(() => {
    if (!db) return;
    getCmsPage(db, pageId).then(setPage);
  }, [pageId]);

  function openCreateForm() {
    setEditingSection(null);
    setFormOpen(true);
  }
  function openEditForm(section: CmsSectionDoc) {
    setEditingSection(section);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditingSection(null);
  }

  const nextOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) + 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/website/pages" className="text-sm text-white/50 hover:text-white">
              ← Pages
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {page === undefined ? <Spinner className="h-5 w-5" /> : page ? page.title : "Page not found"}
          </h1>
          {page && (
            <p className="text-sm text-white/50">
              /p/{page.slug} ·{" "}
              <Link href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
                Live preview
              </Link>
            </p>
          )}
        </div>
        {!formOpen && page && (
          <Button size="sm" onClick={openCreateForm}>
            Add section
          </Button>
        )}
      </div>

      {page === null && <Alert variant="error">This page no longer exists.</Alert>}

      {formOpen && page && (
        <CmsSectionForm
          pageId={pageId}
          nextOrder={nextOrder}
          initialSection={editingSection ?? undefined}
          onDone={closeForm}
          onCancel={closeForm}
        />
      )}

      {page && (
        <CmsSectionList
          sections={sections}
          loading={loading}
          error={error}
          retry={retry}
          onEdit={openEditForm}
        />
      )}
    </div>
  );
}
