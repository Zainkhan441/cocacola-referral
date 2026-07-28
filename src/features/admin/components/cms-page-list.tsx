"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { setCmsPagePublishedAction, deleteCmsPageAction } from "@/features/admin/lib/cms-page-actions";
import { formatDate } from "@/lib/format";
import type { CmsPageDoc } from "@/lib/firestore/cms-pages";

type CmsPageListProps = {
  pages: CmsPageDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onEdit: (page: CmsPageDoc) => void;
};

export function CmsPageList({ pages, loading, error, retry, onEdit }: CmsPageListProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleTogglePublished(page: CmsPageDoc) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(page.id);
    try {
      await setCmsPagePublishedAction(page.id, page.title, !page.isPublished, reviewer());
    } catch {
      setRowError("Couldn’t update that page. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(page: CmsPageDoc) {
    if (!user || busyId) return;
    const confirmed = await confirm({
      title: `Delete "${page.title}"?`,
      message: "This will also delete all its sections. This action cannot be undone.",
      variant: "delete",
    });
    if (!confirmed) return;
    setRowError(null);
    setBusyId(page.id);
    try {
      await deleteCmsPageAction(page.id, page.title, reviewer());
      toast.success(`"${page.title}" was deleted.`);
    } catch {
      setRowError("Couldn’t delete that page. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
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

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
        <FileText className="h-6 w-6 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">No pages yet. Create the first one above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rowError && <Alert variant="error">{rowError}</Alert>}
      {pages.map((page) => (
        <div
          key={page.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{page.title}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  page.isPublished
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/50"
                }`}
              >
                {page.isPublished ? "Published" : "Draft"}
              </span>
            </div>
            <p className="text-xs text-white/50">
              /p/{page.slug} · Updated {formatDate(page.updatedAt)}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Link href={`/admin/website/pages/${page.id}`}>
              <Button variant="outline" size="sm">
                Edit sections
              </Button>
            </Link>
            <Link href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                Preview
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => onEdit(page)} disabled={busyId === page.id}>
              Edit details
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyId === page.id}
              onClick={() => handleTogglePublished(page)}
            >
              {page.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyId === page.id}
              onClick={() => handleDelete(page)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
