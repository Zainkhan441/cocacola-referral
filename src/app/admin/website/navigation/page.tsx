"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { useAdminCmsLinks } from "@/features/admin/hooks/use-admin-cms-links";
import { seedDefaultNavLinksIfEmpty } from "@/features/admin/lib/cms-seed";
import { CmsOrderedRowControls } from "@/features/admin/components/cms-ordered-row-controls";
import { StatusFilterTabs } from "@/features/admin/components/status-filter-tabs";
import {
  createCmsLinkAction,
  updateCmsLinkAction,
  setCmsLinkPublishedAction,
  deleteCmsLinkAction,
  moveCmsLinkAction,
} from "@/features/admin/lib/cms-link-actions";
import { validateRequiredText, validateSafeUrl } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { CmsLinkDoc, CmsLinkPlacement } from "@/lib/firestore/cms-links";

const PLACEMENT_OPTIONS: Array<{ label: string; value: CmsLinkPlacement }> = [
  { label: "Header", value: "header" },
  { label: "Footer: Navigation", value: "footer_nav" },
  { label: "Footer: Legal", value: "footer_legal" },
  { label: "Footer: Support", value: "footer_support" },
];

type FieldErrors = Partial<Record<"label" | "url", string>>;

function LinkForm({
  placement,
  initial,
  onDone,
  onCancel,
}: {
  placement: CmsLinkPlacement;
  initial?: CmsLinkDoc;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isEditing = Boolean(initial);

  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    // Header/anchor links (e.g. "#faq" or "/guide") aren't always full
    // http(s) URLs, so only enforce the strict safe-URL check for links
    // that look like an absolute URL; relative/anchor links just need to
    // be non-empty.
    const isAbsolute = /^https?:\/\//i.test(url.trim());
    const errors: FieldErrors = {
      label: validateRequiredText(label, "Label") ?? undefined,
      url: isAbsolute
        ? validateSafeUrl(url, "URL") ?? undefined
        : validateRequiredText(url, "URL") ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const input = { placement, label: label.trim(), url: url.trim(), order: initial?.order ?? Date.now(), isPublished };
    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initial) {
        await updateCmsLinkAction(initial.id, input, reviewer);
      } else {
        await createCmsLinkAction(input, reviewer);
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
      <h2 className="text-sm font-semibold text-white">{isEditing ? "Edit link" : "New link"}</h2>
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField label="Label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} error={fieldErrors.label} />
      <FormField
        label="URL (relative like /guide, anchor like #faq, or full https://…)"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        error={fieldErrors.url}
      />

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand" />
        Published
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create link"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCmsNavigationPage() {
  const { user } = useAuth();
  const [placement, setPlacement] = useState<CmsLinkPlacement>("header");
  const { links, loading, error, retry } = useAdminCmsLinks(placement);
  const confirm = useConfirm();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CmsLinkDoc | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // One-time migration of the real, previously-hardcoded header/footer nav
  // links into this admin-editable collection — a no-op once any link exists.
  useEffect(() => {
    if (!db) return;
    seedDefaultNavLinksIfEmpty(db).catch(() => {});
  }, []);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleToggle(item: CmsLinkDoc) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await setCmsLinkPublishedAction(item.id, item.label, !item.isPublished, reviewer());
    } catch {
      setRowError("Couldn’t update that link.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: CmsLinkDoc) {
    if (!user || busyId) return;
    const confirmed = await confirm({
      title: `Delete "${item.label}"?`,
      message: "This navigation link will be permanently removed. This action cannot be undone.",
      variant: "delete",
    });
    if (!confirmed) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await deleteCmsLinkAction(item.id, item.label, reviewer());
      toast.success(`"${item.label}" was deleted.`);
    } catch {
      setRowError("Couldn’t delete that link.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!user || busyId) return;
    const neighborIndex = index + direction;
    if (neighborIndex < 0 || neighborIndex >= links.length) return;
    setRowError(null);
    setBusyId(links[index].id);
    try {
      await moveCmsLinkAction(links[index], links[neighborIndex], reviewer());
    } catch {
      setRowError("Couldn’t reorder links.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Navigation</h1>
          <p className="text-sm text-white/50">Header navigation and footer content on the public site.</p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            New link
          </Button>
        )}
      </div>

      <StatusFilterTabs options={PLACEMENT_OPTIONS} value={placement} onChange={setPlacement} />

      {formOpen && (
        <LinkForm
          placement={placement}
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

      {!loading && !error && links.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <Link2 className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No links here yet. Create the first one above.</p>
        </div>
      )}

      {!loading && !error && links.length > 0 && (
        <div className="flex flex-col gap-3">
          {rowError && <Alert variant="error">{rowError}</Alert>}
          {links.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{item.label}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${item.isPublished ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/50"}`}>
                    {item.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-white/50">{item.url}</p>
              </div>
              <CmsOrderedRowControls
                isFirst={index === 0}
                isLast={index === links.length - 1}
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
