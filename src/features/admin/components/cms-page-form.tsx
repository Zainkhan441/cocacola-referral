"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { createCmsPageAction, updateCmsPageAction } from "@/features/admin/lib/cms-page-actions";
import { validateSlug, validateRequiredText } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { CmsPageDoc, CmsPageInput } from "@/lib/firestore/cms-pages";

type CmsPageFormProps = {
  initialPage?: CmsPageDoc;
  onDone: () => void;
  onCancel: () => void;
};

type FieldErrors = Partial<Record<"slug" | "title", string>>;

export function CmsPageForm({ initialPage, onDone, onCancel }: CmsPageFormProps) {
  const { user } = useAuth();
  const isEditing = Boolean(initialPage);

  const [slug, setSlug] = useState(initialPage?.slug ?? "");
  const [title, setTitle] = useState(initialPage?.title ?? "");
  const [metaDescription, setMetaDescription] = useState(initialPage?.metaDescription ?? "");
  const [isPublished, setIsPublished] = useState(initialPage?.isPublished ?? false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const input: CmsPageInput = {
      slug: slug.trim().toLowerCase(),
      title: title.trim(),
      metaDescription: metaDescription.trim() || null,
      isPublished,
    };

    const errors: FieldErrors = {
      slug: validateSlug(input.slug) ?? undefined,
      title: validateRequiredText(input.title, "Title") ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initialPage) {
        await updateCmsPageAction(initialPage.id, input, reviewer);
      } else {
        await createCmsPageAction(input, reviewer);
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
      <h2 className="text-sm font-semibold text-white">
        {isEditing ? `Edit "${initialPage?.title}"` : "Create a new page"}
      </h2>

      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldErrors.title}
      />
      <FormField
        label="Slug (URL: /p/slug)"
        type="text"
        placeholder="about-us"
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        error={fieldErrors.slug}
      />
      <FormField
        label="Meta description (optional)"
        type="text"
        value={metaDescription}
        onChange={(event) => setMetaDescription(event.target.value)}
      />

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand"
        />
        Published (publicly visible)
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create page"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
