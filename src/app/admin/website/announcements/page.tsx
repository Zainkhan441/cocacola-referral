"use client";

import { useState, type FormEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { useAdminCmsAnnouncements } from "@/features/admin/hooks/use-admin-cms-announcements";
import { CmsOrderedRowControls } from "@/features/admin/components/cms-ordered-row-controls";
import {
  createCmsAnnouncementAction,
  updateCmsAnnouncementAction,
  setCmsAnnouncementPublishedAction,
  deleteCmsAnnouncementAction,
  moveCmsAnnouncementAction,
} from "@/features/admin/lib/cms-announcement-actions";
import { validateRequiredText, validateOptionalSafeUrl, validateDateRange } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { formatDate } from "@/lib/format";
import type { CmsAnnouncementDoc } from "@/lib/firestore/cms-announcements";

function toDateInputValue(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return "";
  return timestamp.toDate().toISOString().slice(0, 10);
}

type FieldErrors = Partial<Record<"title" | "message" | "buttonUrl" | "dateRange", string>>;

function AnnouncementForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: CmsAnnouncementDoc;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isEditing = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [buttonLabel, setButtonLabel] = useState(initial?.buttonLabel ?? "");
  const [buttonUrl, setButtonUrl] = useState(initial?.buttonUrl ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initial?.endDate));
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;

    const errors: FieldErrors = {
      title: validateRequiredText(title, "Title") ?? undefined,
      message: validateRequiredText(message, "Message") ?? undefined,
      buttonUrl: validateOptionalSafeUrl(buttonUrl, "Button URL") ?? undefined,
      dateRange: validateDateRange(startDateObj, endDateObj) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const input = {
      title: title.trim(),
      message: message.trim(),
      buttonLabel: buttonLabel.trim() || null,
      buttonUrl: buttonUrl.trim() || null,
      order: initial?.order ?? Date.now(),
      isPublished,
      startDate: startDateObj ? Timestamp.fromDate(startDateObj) : null,
      endDate: endDateObj ? Timestamp.fromDate(endDateObj) : null,
    };

    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initial) {
        await updateCmsAnnouncementAction(initial.id, input, reviewer);
      } else {
        await createCmsAnnouncementAction(input, reviewer);
      }
      onDone();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6"
    >
      <h2 className="text-sm font-semibold text-white">{isEditing ? "Edit announcement" : "New announcement"}</h2>
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField label="Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} error={fieldErrors.title} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldErrors.message && <p className="text-xs text-red-400">{fieldErrors.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Button label (optional)" type="text" value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
        <FormField label="Button URL (optional)" type="url" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} error={fieldErrors.buttonUrl} />
        <FormField label="Start date (optional)" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} error={fieldErrors.dateRange} />
        <FormField label="End date (optional)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand" />
        Published
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create announcement"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCmsAnnouncementsPage() {
  const { user } = useAuth();
  const { announcements, loading, error, retry } = useAdminCmsAnnouncements();
  const confirm = useConfirm();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CmsAnnouncementDoc | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function reviewer() {
    if (!user) throw new Error("Not signed in.");
    return { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };
  }

  async function handleToggle(item: CmsAnnouncementDoc) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await setCmsAnnouncementPublishedAction(item.id, item.title, !item.isPublished, reviewer());
    } catch {
      setRowError("Couldn’t update that announcement.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: CmsAnnouncementDoc) {
    if (!user || busyId) return;
    const confirmed = await confirm({
      title: `Delete "${item.title}"?`,
      message: "This announcement will be permanently removed. This action cannot be undone.",
      variant: "delete",
    });
    if (!confirmed) return;
    setRowError(null);
    setBusyId(item.id);
    try {
      await deleteCmsAnnouncementAction(item.id, item.title, reviewer());
      toast.success(`"${item.title}" was deleted.`);
    } catch {
      setRowError("Couldn’t delete that announcement.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!user || busyId) return;
    const neighborIndex = index + direction;
    if (neighborIndex < 0 || neighborIndex >= announcements.length) return;
    setRowError(null);
    setBusyId(announcements[index].id);
    try {
      await moveCmsAnnouncementAction(announcements[index], announcements[neighborIndex], reviewer());
    } catch {
      setRowError("Couldn’t reorder announcements.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-sm text-white/50">Site-wide banners shown on the public homepage.</p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            New announcement
          </Button>
        )}
      </div>

      {formOpen && (
        <AnnouncementForm
          initial={editing ?? undefined}
          onDone={() => { setFormOpen(false); setEditing(null); }}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
        </div>
      )}

      {!loading && !error && announcements.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <Megaphone className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No announcements yet. Create the first one above.</p>
        </div>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="flex flex-col gap-3">
          {rowError && <Alert variant="error">{rowError}</Alert>}
          {announcements.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{item.title}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${item.isPublished ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/50"}`}>
                    {item.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  {item.message}
                  {item.startDate ? ` · From ${formatDate(item.startDate)}` : ""}
                  {item.endDate ? ` to ${formatDate(item.endDate)}` : ""}
                </p>
              </div>
              <CmsOrderedRowControls
                isFirst={index === 0}
                isLast={index === announcements.length - 1}
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
