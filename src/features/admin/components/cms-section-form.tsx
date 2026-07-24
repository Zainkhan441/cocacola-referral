"use client";

import { useState, type FormEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import {
  createCmsSectionAction,
  updateCmsSectionAction,
} from "@/features/admin/lib/cms-section-actions";
import { validateOptionalSafeUrl, validateDateRange } from "@/features/admin/lib/cms-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type {
  CmsSectionDoc,
  CmsSectionInput,
  CmsSectionItem,
  CmsSectionType,
} from "@/lib/firestore/cms-sections";

const SECTION_TYPES: Array<{ value: CmsSectionType; label: string; usesItems: boolean }> = [
  { value: "hero", label: "Hero", usesItems: false },
  { value: "rich_text", label: "Rich text", usesItems: false },
  { value: "image_text", label: "Image with text", usesItems: false },
  { value: "cards_grid", label: "Cards grid", usesItems: true },
  { value: "faq", label: "FAQ", usesItems: true },
  { value: "contact_block", label: "Contact block", usesItems: false },
  { value: "cta", label: "Call-to-action", usesItems: false },
  { value: "banner", label: "Banner", usesItems: false },
  { value: "video", label: "Video", usesItems: false },
  { value: "document", label: "Download / document", usesItems: false },
  { value: "social_links", label: "Social links", usesItems: true },
];

function toDateInputValue(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return "";
  return timestamp.toDate().toISOString().slice(0, 10);
}

const EMPTY_ITEM: CmsSectionItem = {
  title: "",
  subtitle: null,
  description: null,
  mediaUrl: null,
  buttonLabel: null,
  buttonUrl: null,
};

type CmsSectionFormProps = {
  pageId: string;
  nextOrder: number;
  initialSection?: CmsSectionDoc;
  onDone: () => void;
  onCancel: () => void;
};

type FieldErrors = Partial<Record<"mediaUrl" | "buttonUrl" | "dateRange", string>>;

export function CmsSectionForm({ pageId, nextOrder, initialSection, onDone, onCancel }: CmsSectionFormProps) {
  const { user } = useAuth();
  const isEditing = Boolean(initialSection);

  const [type, setType] = useState<CmsSectionType>(initialSection?.type ?? "hero");
  const [title, setTitle] = useState(initialSection?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialSection?.subtitle ?? "");
  const [description, setDescription] = useState(initialSection?.description ?? "");
  const [richText, setRichText] = useState(initialSection?.richText ?? "");
  const [mediaUrl, setMediaUrl] = useState(initialSection?.mediaUrl ?? "");
  const [buttonLabel, setButtonLabel] = useState(initialSection?.buttonLabel ?? "");
  const [buttonUrl, setButtonUrl] = useState(initialSection?.buttonUrl ?? "");
  const [items, setItems] = useState<CmsSectionItem[]>(initialSection?.items ?? []);
  const [isPublished, setIsPublished] = useState(initialSection?.isPublished ?? true);
  const [startDate, setStartDate] = useState(toDateInputValue(initialSection?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initialSection?.endDate));

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usesItems = SECTION_TYPES.find((entry) => entry.value === type)?.usesItems ?? false;

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }
  function updateItem(index: number, patch: Partial<CmsSectionItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;

    const errors: FieldErrors = {
      mediaUrl: validateOptionalSafeUrl(mediaUrl, "Media URL") ?? undefined,
      buttonUrl: validateOptionalSafeUrl(buttonUrl, "Button URL") ?? undefined,
      dateRange: validateDateRange(startDateObj, endDateObj) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const input: CmsSectionInput = {
      pageId,
      type,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      richText: richText.trim() || null,
      mediaUrl: mediaUrl.trim() || null,
      buttonLabel: buttonLabel.trim() || null,
      buttonUrl: buttonUrl.trim() || null,
      items: usesItems
        ? items
            .filter((item) => item.title.trim())
            .map((item) => ({
              title: item.title.trim(),
              subtitle: item.subtitle?.trim() || null,
              description: item.description?.trim() || null,
              mediaUrl: item.mediaUrl?.trim() || null,
              buttonLabel: item.buttonLabel?.trim() || null,
              buttonUrl: item.buttonUrl?.trim() || null,
            }))
        : [],
      order: initialSection?.order ?? nextOrder,
      isPublished,
      startDate: startDateObj ? Timestamp.fromDate(startDateObj) : null,
      endDate: endDateObj ? Timestamp.fromDate(endDateObj) : null,
    };

    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initialSection) {
        await updateCmsSectionAction(initialSection.id, input, reviewer);
      } else {
        await createCmsSectionAction(input, reviewer);
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
        {isEditing ? "Edit section" : "Add a section"}
      </h2>

      {formError && <Alert variant="error">{formError}</Alert>}

      <SelectField
        label="Section type"
        value={type}
        onChange={(event) => setType(event.target.value as CmsSectionType)}
      >
        {SECTION_TYPES.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Title (optional)" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
        <FormField
          label="Subtitle (optional)"
          type="text"
          value={subtitle}
          onChange={(event) => setSubtitle(event.target.value)}
        />
        <FormField
          label="Media URL (optional)"
          type="url"
          value={mediaUrl}
          onChange={(event) => setMediaUrl(event.target.value)}
          error={fieldErrors.mediaUrl}
        />
        <FormField
          label="Button label (optional)"
          type="text"
          value={buttonLabel}
          onChange={(event) => setButtonLabel(event.target.value)}
        />
        <FormField
          label="Button URL (optional)"
          type="url"
          value={buttonUrl}
          onChange={(event) => setButtonUrl(event.target.value)}
          error={fieldErrors.buttonUrl}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Description (optional)</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Rich text (optional, plain text — line breaks preserved)</label>
        <textarea
          value={richText}
          onChange={(event) => setRichText(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
      </div>

      {usesItems && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">
              {type === "faq" ? "Questions" : type === "social_links" ? "Links" : "Cards"}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add
            </Button>
          </div>

          {items.length === 0 && (
            <p className="text-xs text-white/40">No items yet — add at least one above.</p>
          )}

          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder={type === "faq" ? "Question" : "Title"}
                  value={item.title}
                  onChange={(event) => updateItem(index, { title: event.target.value })}
                  className="flex-1 rounded-lg border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label="Remove item"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <textarea
                placeholder={type === "faq" ? "Answer" : "Description"}
                value={item.description ?? ""}
                onChange={(event) => updateItem(index, { description: event.target.value })}
                rows={2}
                className="w-full rounded-lg border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
              />
              {type === "cards_grid" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="url"
                    placeholder="Media URL"
                    value={item.mediaUrl ?? ""}
                    onChange={(event) => updateItem(index, { mediaUrl: event.target.value })}
                    className="rounded-lg border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Button label"
                    value={item.buttonLabel ?? ""}
                    onChange={(event) => updateItem(index, { buttonLabel: event.target.value })}
                    className="rounded-lg border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Button URL"
                    value={item.buttonUrl ?? ""}
                    onChange={(event) => updateItem(index, { buttonUrl: event.target.value })}
                    className="rounded-lg border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
                  />
                </div>
              )}
              {type === "social_links" && (
                <input
                  type="url"
                  placeholder="Link URL"
                  value={item.buttonUrl ?? ""}
                  onChange={(event) => updateItem(index, { buttonUrl: event.target.value })}
                  className="rounded-lg border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Start date (optional)"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={fieldErrors.dateRange}
        />
        <FormField
          label="End date (optional)"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand"
        />
        Published
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Add section"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
