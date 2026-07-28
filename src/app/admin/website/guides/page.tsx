"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { useAdminCmsGuideSteps } from "@/features/admin/hooks/use-admin-cms-guide-steps";
import { seedDefaultGuidesIfEmpty } from "@/features/admin/lib/cms-seed";
import { CmsOrderedRowControls } from "@/features/admin/components/cms-ordered-row-controls";
import { StatusFilterTabs } from "@/features/admin/components/status-filter-tabs";
import {
  createCmsGuideStepAction,
  updateCmsGuideStepAction,
  setCmsGuideStepPublishedAction,
  deleteCmsGuideStepAction,
  moveCmsGuideStepAction,
} from "@/features/admin/lib/cms-guide-actions";
import { validateRequiredText } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { CmsGuideCategory, CmsGuideStepDoc } from "@/lib/firestore/cms-guides";

const CATEGORY_OPTIONS: Array<{ label: string; value: CmsGuideCategory }> = [
  { label: "Deposit", value: "deposit" },
  { label: "Withdrawal", value: "withdrawal" },
  { label: "Referral", value: "referral" },
  { label: "Package", value: "package" },
];

type FieldErrors = Partial<Record<"title" | "body", string>>;

function GuideStepForm({
  category,
  initial,
  onDone,
  onCancel,
}: {
  category: CmsGuideCategory;
  initial?: CmsGuideStepDoc;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isEditing = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const errors: FieldErrors = {
      title: validateRequiredText(title, "Title") ?? undefined,
      body: validateRequiredText(body, "Body") ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const input = {
      category,
      title: title.trim(),
      body: body.trim(),
      order: initial?.order ?? Date.now(),
      isPublished,
    };
    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initial) {
        await updateCmsGuideStepAction(initial.id, input, reviewer);
      } else {
        await createCmsGuideStepAction(input, reviewer);
      }
      onDone();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">{isEditing ? "Edit guide step" : "New guide step"}</h2>
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField label="Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} error={fieldErrors.title} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldErrors.body && <p className="text-xs text-red-400">{fieldErrors.body}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand" />
        Published
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create step"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCmsGuidesPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<CmsGuideCategory>("deposit");
  const { steps, loading, error, retry } = useAdminCmsGuideSteps(category);
  const confirm = useConfirm();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CmsGuideStepDoc | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // One-time migration of the real, previously-hardcoded guide steps into
  // this admin-editable collection — a no-op once any step exists.
  useEffect(() => {
    if (!db) return;
    seedDefaultGuidesIfEmpty(db).catch(() => {});
  }, []);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleToggle(item: CmsGuideStepDoc) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await setCmsGuideStepPublishedAction(item.id, item.title, !item.isPublished, reviewer());
    } catch {
      setRowError("Couldn’t update that step.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: CmsGuideStepDoc) {
    if (!user || busyId) return;
    const confirmed = await confirm({
      title: `Delete "${item.title}"?`,
      message: "This guide step will be permanently removed. This action cannot be undone.",
      variant: "delete",
    });
    if (!confirmed) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await deleteCmsGuideStepAction(item.id, item.title, reviewer());
      toast.success(`"${item.title}" was deleted.`);
    } catch {
      setRowError("Couldn’t delete that step.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!user || busyId) return;
    const neighborIndex = index + direction;
    if (neighborIndex < 0 || neighborIndex >= steps.length) return;
    setRowError(null);
    setBusyId(steps[index].id);
    try {
      await moveCmsGuideStepAction(steps[index], steps[neighborIndex], reviewer());
    } catch {
      setRowError("Couldn’t reorder steps.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Guides</h1>
          <p className="text-sm text-white/50">Step-by-step guides shown in the Guide &amp; Help Center.</p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            New step
          </Button>
        )}
      </div>

      <StatusFilterTabs options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />

      {formOpen && (
        <GuideStepForm
          category={category}
          initial={editing ?? undefined}
          onDone={() => { setFormOpen(false); setEditing(null); }}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
        </div>
      )}

      {!loading && !error && steps.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <BookOpen className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No {category} guide steps yet. Create the first one above.</p>
        </div>
      )}

      {!loading && !error && steps.length > 0 && (
        <div className="flex flex-col gap-3">
          {rowError && <Alert variant="error">{rowError}</Alert>}
          {steps.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{item.title}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${item.isPublished ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/50"}`}>
                    {item.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-white/50">{item.body}</p>
              </div>
              <CmsOrderedRowControls
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                isPublished={item.isPublished}
                busy={busyId === item.id}
                onMoveUp={() => handleMove(index, -1)}
                onMoveDown={() => handleMove(index, 1)}
                onTogglePublished={() => handleToggle(item)}
                onEdit={() => { setEditing(item); setFormOpen(true); }}
                onDelete={() => handleDelete(item)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
