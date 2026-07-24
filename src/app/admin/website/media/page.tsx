"use client";

import { useState, type FormEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useAdminCmsMedia } from "@/features/admin/hooks/use-admin-cms-media";
import { createCmsMediaAction, deleteCmsMediaAction } from "@/features/admin/lib/cms-media-actions";
import { validateRequiredText, validateSafeUrl } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { formatDate } from "@/lib/format";
import type { CmsMediaType } from "@/lib/firestore/cms-media";

type FieldErrors = Partial<Record<"label" | "url", string>>;

function MediaForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<CmsMediaType>("image");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const errors: FieldErrors = {
      label: validateRequiredText(label, "Label") ?? undefined,
      url: validateSafeUrl(url, "URL") ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      await createCmsMediaAction({ label: label.trim(), url: url.trim(), type }, reviewer);
      onDone();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">Add media</h2>
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} error={fieldErrors.label} />
        <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value as CmsMediaType)}>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
        </SelectField>
      </div>
      <FormField label="URL" type="url" value={url} onChange={(e) => setUrl(e.target.value)} error={fieldErrors.url} />

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : "Add to library"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCmsMediaPage() {
  const { user } = useAuth();
  const { media, loading, error, retry } = useAdminCmsMedia();
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleDelete(id: string, label: string) {
    if (!user || busyId) return;
    if (!window.confirm(`Remove "${label}" from the media library?`)) return;
    setRowError(null);
    setBusyId(id);
    try {
      await deleteCmsMediaAction(id, label, { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" });
    } catch {
      setRowError("Couldn’t remove that media item.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Media library</h1>
          <p className="text-sm text-white/50">
            A reference list of vetted external image/video/document URLs for reuse when building
            pages — copy a URL from here into any section field.
          </p>
        </div>
        {!formOpen && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            Add media
          </Button>
        )}
      </div>

      {formOpen && <MediaForm onDone={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />}

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

      {!loading && !error && media.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <ImageIcon className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">No media yet. Add the first item above.</p>
        </div>
      )}

      {!loading && !error && media.length > 0 && (
        <div className="flex flex-col gap-3">
          {rowError && <Alert variant="error">{rowError}</Alert>}
          {media.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{item.label}</p>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
                    {item.type}
                  </span>
                </div>
                <p className="truncate text-xs text-white/50">
                  {item.url} · Added {formatDate(item.createdAt)}
                </p>
              </div>
              <Button variant="outline" size="sm" disabled={busyId === item.id} onClick={() => handleDelete(item.id, item.label)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
