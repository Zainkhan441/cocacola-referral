"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { useAdminCmsRules } from "@/features/admin/hooks/use-admin-cms-rules";
import { seedDefaultRulesIfEmpty } from "@/features/admin/lib/cms-seed";
import { CmsOrderedRowControls } from "@/features/admin/components/cms-ordered-row-controls";
import {
  createCmsRuleAction,
  updateCmsRuleAction,
  setCmsRulePublishedAction,
  deleteCmsRuleAction,
  moveCmsRuleAction,
} from "@/features/admin/lib/cms-rule-actions";
import { validateRequiredText } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { CmsRuleDoc } from "@/lib/firestore/cms-rules";

function RuleForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: CmsRuleDoc;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isEditing = Boolean(initial);

  const [text, setText] = useState(initial?.text ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const error = validateRequiredText(text, "Rule text");
    setFieldError(error);
    if (error) return;

    const input = { text: text.trim(), order: initial?.order ?? Date.now(), isPublished };
    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initial) {
        await updateCmsRuleAction(initial.id, input, reviewer);
      } else {
        await createCmsRuleAction(input, reviewer);
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
      <h2 className="text-sm font-semibold text-white">{isEditing ? "Edit rule" : "New rule"}</h2>
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Rule text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldError && <p className="text-xs text-red-400">{fieldError}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand" />
        Published
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create rule"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCmsRulesPage() {
  const { user } = useAuth();
  const { rules, loading, error, retry } = useAdminCmsRules();
  const confirm = useConfirm();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CmsRuleDoc | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // One-time migration of the real, previously-hardcoded rules into this
  // admin-editable collection — a no-op once any rule exists.
  useEffect(() => {
    if (!db) return;
    seedDefaultRulesIfEmpty(db).catch(() => {});
  }, []);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleToggle(item: CmsRuleDoc) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await setCmsRulePublishedAction(item.id, !item.isPublished, reviewer());
    } catch {
      setRowError("Couldn’t update that rule.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: CmsRuleDoc) {
    if (!user || busyId) return;
    const confirmed = await confirm({
      title: "Delete this rule?",
      message: "This rule will be permanently removed. This action cannot be undone.",
      variant: "delete",
    });
    if (!confirmed) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await deleteCmsRuleAction(item.id, reviewer());
      toast.success("Rule deleted.");
    } catch {
      setRowError("Couldn’t delete that rule.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!user || busyId) return;
    const neighborIndex = index + direction;
    if (neighborIndex < 0 || neighborIndex >= rules.length) return;
    setRowError(null);
    setBusyId(rules[index].id);
    try {
      await moveCmsRuleAction(rules[index], rules[neighborIndex], reviewer());
    } catch {
      setRowError("Couldn’t reorder rules.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform rules</h1>
          <p className="text-sm text-white/50">Feeds the Guide &amp; Help Center’s Rules tab.</p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            New rule
          </Button>
        )}
      </div>

      {formOpen && (
        <RuleForm
          initial={editing ?? undefined}
          onDone={() => { setFormOpen(false); setEditing(null); }}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
        </div>
      )}

      {!loading && !error && rules.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <ListChecks className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No rules yet. Create the first one above.</p>
        </div>
      )}

      {!loading && !error && rules.length > 0 && (
        <div className="flex flex-col gap-3">
          {rowError && <Alert variant="error">{rowError}</Alert>}
          {rules.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white">{item.text}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${item.isPublished ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/50"}`}>
                    {item.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              <CmsOrderedRowControls
                isFirst={index === 0}
                isLast={index === rules.length - 1}
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
