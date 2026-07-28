"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Layers } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  setCmsSectionPublishedAction,
  deleteCmsSectionAction,
  moveCmsSectionAction,
} from "@/features/admin/lib/cms-section-actions";
import type { CmsSectionDoc } from "@/lib/firestore/cms-sections";

type CmsSectionListProps = {
  sections: CmsSectionDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onEdit: (section: CmsSectionDoc) => void;
};

export function CmsSectionList({ sections, loading, error, retry, onEdit }: CmsSectionListProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleTogglePublished(section: CmsSectionDoc) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(section.id);
    try {
      await setCmsSectionPublishedAction(section.id, !section.isPublished, reviewer());
    } catch {
      setRowError("Couldn’t update that section. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(section: CmsSectionDoc) {
    if (!user || busyId) return;
    const confirmed = await confirm({
      title: "Delete this section?",
      message: "This action cannot be undone.",
      variant: "delete",
    });
    if (!confirmed) return;
    setRowError(null);
    setBusyId(section.id);
    try {
      await deleteCmsSectionAction(section.id, reviewer());
      toast.success("Section deleted.");
    } catch {
      setRowError("Couldn’t delete that section. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!user || busyId) return;
    const neighborIndex = index + direction;
    if (neighborIndex < 0 || neighborIndex >= sections.length) return;
    setRowError(null);
    setBusyId(sections[index].id);
    try {
      await moveCmsSectionAction(sections[index], sections[neighborIndex], reviewer());
    } catch {
      setRowError("Couldn’t reorder sections. Please try again.");
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

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
        <Layers className="h-6 w-6 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">No sections yet. Add the first one above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rowError && <Alert variant="error">{rowError}</Alert>}
      {sections.map((section, index) => (
        <div
          key={section.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0 || busyId === section.id}
                aria-label="Move up"
                className="flex h-6 w-6 items-center justify-center rounded text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={index === sections.length - 1 || busyId === section.id}
                aria-label="Move down"
                className="flex h-6 w-6 items-center justify-center rounded text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
                  {section.type.replace("_", " ")}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    section.isPublished
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-white/15 bg-white/5 text-white/50"
                  }`}
                >
                  {section.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <p className="font-semibold text-white">{section.title ?? "(no title)"}</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(section)} disabled={busyId === section.id}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyId === section.id}
              onClick={() => handleTogglePublished(section)}
            >
              {section.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="outline" size="sm" disabled={busyId === section.id} onClick={() => handleDelete(section)}>
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
