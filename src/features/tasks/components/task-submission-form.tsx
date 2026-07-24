"use client";

import { useState, type FormEvent } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { submitTaskCompletion } from "@/features/tasks/lib/actions";
import { validateScreenshotUrl } from "@/features/wallet/lib/validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { formatCurrency } from "@/lib/format";
import type { TaskDoc } from "@/lib/firestore/tasks";

type TaskSubmissionFormProps = {
  task: TaskDoc;
  onDone: () => void;
  onCancel: () => void;
};

type FieldErrors = {
  textResponse?: string;
  proofScreenshotUrl?: string;
};

export function TaskSubmissionForm({ task, onDone, onCancel }: TaskSubmissionFormProps) {
  const { user } = useAuth();

  const [textResponse, setTextResponse] = useState("");
  const [proofScreenshotUrl, setProofScreenshotUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;

    setFormError(null);

    const errors: FieldErrors = {
      textResponse: textResponse.trim() ? undefined : "Please describe how you completed this task.",
      proofScreenshotUrl: task.proofRequired && !proofScreenshotUrl.trim()
        ? "A proof screenshot URL is required for this task."
        : (validateScreenshotUrl(proofScreenshotUrl) ?? undefined),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await submitTaskCompletion({
        uid: user.uid,
        userName: user.displayName ?? user.email ?? "Unknown",
        taskId: task.id,
        textResponse,
        proofScreenshotUrl: proofScreenshotUrl.trim() || null,
      });
      setSuccess(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-5">
        <Alert variant="success">
          Submission for &quot;{task.title}&quot; sent. We’ll review it shortly and credit{" "}
          {formatCurrency(task.rewardAmount)} to your wallet once approved.
        </Alert>
        <Button variant="outline" size="md" onClick={onDone} className="self-start">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Complete &quot;{task.title}&quot;</h3>
        <p className="text-lg font-bold text-white">{formatCurrency(task.rewardAmount)}</p>
      </div>

      <p className="whitespace-pre-wrap text-sm text-white/60">{task.instructions}</p>

      <a
        href={task.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-medium text-brand-light transition-colors hover:bg-brand/20"
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        Watch video to complete this task
      </a>

      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Your response</label>
        <textarea
          value={textResponse}
          onChange={(event) => setTextResponse(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldErrors.textResponse && <p className="text-xs text-red-400">{fieldErrors.textResponse}</p>}
      </div>

      <FormField
        label={task.proofRequired ? "Proof screenshot URL" : "Proof screenshot URL (optional)"}
        type="url"
        value={proofScreenshotUrl}
        onChange={(event) => setProofScreenshotUrl(event.target.value)}
        error={fieldErrors.proofScreenshotUrl}
      />

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : "Submit"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
