"use client";

import { useEffect, useState, type FormEvent } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { useAdminCmsFaq } from "@/features/admin/hooks/use-admin-cms-faq";
import { seedDefaultFaqIfEmpty } from "@/features/admin/lib/cms-seed";
import { CmsOrderedRowControls } from "@/features/admin/components/cms-ordered-row-controls";
import {
  createCmsFaqItemAction,
  updateCmsFaqItemAction,
  setCmsFaqItemPublishedAction,
  deleteCmsFaqItemAction,
  moveCmsFaqItemAction,
} from "@/features/admin/lib/cms-faq-actions";
import { validateRequiredText } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { CmsFaqItemDoc } from "@/lib/firestore/cms-faq";

type FieldErrors = Partial<Record<"question" | "answer", string>>;

function FaqForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: CmsFaqItemDoc;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isEditing = Boolean(initial);

  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const errors: FieldErrors = {
      question: validateRequiredText(question, "Question") ?? undefined,
      answer: validateRequiredText(answer, "Answer") ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const input = {
      question: question.trim(),
      answer: answer.trim(),
      order: initial?.order ?? Date.now(),
      isPublished,
    };
    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initial) {
        await updateCmsFaqItemAction(initial.id, input, reviewer);
      } else {
        await createCmsFaqItemAction(input, reviewer);
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
      <h2 className="text-sm font-semibold text-white">{isEditing ? "Edit FAQ item" : "New FAQ item"}</h2>
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Question</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldErrors.question && <p className="text-xs text-red-400">{fieldErrors.question}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Answer</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldErrors.answer && <p className="text-xs text-red-400">{fieldErrors.answer}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand" />
        Published
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create FAQ item"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCmsFaqPage() {
  const { user } = useAuth();
  const { faqItems, loading, error, retry } = useAdminCmsFaq();
  const confirm = useConfirm();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CmsFaqItemDoc | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // One-time migration of the real, previously-hardcoded FAQ content into
  // this admin-editable collection — a no-op once any FAQ item exists.
  useEffect(() => {
    if (!db) return;
    seedDefaultFaqIfEmpty(db).catch(() => {});
  }, []);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleToggle(item: CmsFaqItemDoc) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await setCmsFaqItemPublishedAction(item.id, item.question, !item.isPublished, reviewer());
    } catch {
      setRowError("Couldn’t update that FAQ item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: CmsFaqItemDoc) {
    if (!user || busyId) return;
    const confirmed = await confirm({
      title: "Delete this FAQ item?",
      message: `"${item.question}" will be permanently removed. This action cannot be undone.`,
      variant: "delete",
    });
    if (!confirmed) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await deleteCmsFaqItemAction(item.id, item.question, reviewer());
      toast.success("FAQ item deleted.");
    } catch {
      setRowError("Couldn’t delete that FAQ item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!user || busyId) return;
    const neighborIndex = index + direction;
    if (neighborIndex < 0 || neighborIndex >= faqItems.length) return;
    setRowError(null);
    setBusyId(faqItems[index].id);
    try {
      await moveCmsFaqItemAction(faqItems[index], faqItems[neighborIndex], reviewer());
    } catch {
      setRowError("Couldn’t reorder FAQ items.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">FAQ</h1>
          <p className="text-sm text-white/50">Feeds the public landing page FAQ and the Guide & Help Center.</p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            New FAQ item
          </Button>
        )}
      </div>

      {formOpen && (
        <FaqForm
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

      {!loading && !error && faqItems.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <HelpCircle className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No FAQ items yet. Create the first one above.</p>
        </div>
      )}

      {!loading && !error && faqItems.length > 0 && (
        <div className="flex flex-col gap-3">
          {rowError && <Alert variant="error">{rowError}</Alert>}
          {faqItems.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{item.question}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${item.isPublished ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/50"}`}>
                    {item.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-white/50">{item.answer}</p>
              </div>
              <CmsOrderedRowControls
                isFirst={index === 0}
                isLast={index === faqItems.length - 1}
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
