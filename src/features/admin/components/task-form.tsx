"use client";

import { useState, type FormEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useAdminPackages } from "@/features/admin/hooks/use-admin-packages";
import { createTaskAction, updateTaskAction } from "@/features/admin/lib/task-actions";
import {
  validateTaskTitle,
  validateTaskDescription,
  validateTaskInstructions,
  validateRewardAmount,
  validateMinPackagePrice,
  validateDateRange,
} from "@/features/admin/lib/task-validation";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { TaskDoc, TaskInput, TaskFrequency, TaskStatus } from "@/lib/firestore/tasks";

type TaskFormProps = {
  initialTask?: TaskDoc;
  onDone: () => void;
  onCancel: () => void;
};

function toDateInputValue(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return "";
  return timestamp.toDate().toISOString().slice(0, 10);
}

type FieldErrors = Partial<Record<"title" | "description" | "instructions" | "rewardAmount" | "minPackagePrice" | "dateRange", string>>;

export function TaskForm({ initialTask, onDone, onCancel }: TaskFormProps) {
  const { user } = useAuth();
  const { packages } = useAdminPackages();
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(initialTask?.description ?? "");
  const [instructions, setInstructions] = useState(initialTask?.instructions ?? "");
  const [rewardAmount, setRewardAmount] = useState(
    initialTask ? String(initialTask.rewardAmount) : "",
  );
  const [packageRuleMode, setPackageRuleMode] = useState<"any" | "specific" | "minimum">(
    initialTask?.requiredPackageId
      ? "specific"
      : initialTask?.minPackagePrice != null
        ? "minimum"
        : "any",
  );
  const [requiredPackageId, setRequiredPackageId] = useState(initialTask?.requiredPackageId ?? "");
  const [minPackagePrice, setMinPackagePrice] = useState(
    initialTask?.minPackagePrice != null ? String(initialTask.minPackagePrice) : "",
  );
  const [startDate, setStartDate] = useState(toDateInputValue(initialTask?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initialTask?.endDate));
  const [frequency, setFrequency] = useState<TaskFrequency>(initialTask?.frequency ?? "one_time");
  const [proofRequired, setProofRequired] = useState(initialTask?.proofRequired ?? false);
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status ?? "active");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);

    const parsedReward = Number(rewardAmount);
    const parsedMinPrice = packageRuleMode === "minimum" && minPackagePrice ? Number(minPackagePrice) : null;
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;

    const errors: FieldErrors = {
      title: validateTaskTitle(title) ?? undefined,
      description: validateTaskDescription(description) ?? undefined,
      instructions: validateTaskInstructions(instructions) ?? undefined,
      rewardAmount: validateRewardAmount(parsedReward) ?? undefined,
      minPackagePrice: validateMinPackagePrice(parsedMinPrice) ?? undefined,
      dateRange: validateDateRange(startDateObj, endDateObj) ?? undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const input: TaskInput = {
      title: title.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      rewardAmount: parsedReward,
      requiredPackageId: packageRuleMode === "specific" ? requiredPackageId || null : null,
      minPackagePrice: parsedMinPrice,
      startDate: Timestamp.fromDate(startDateObj as Date),
      endDate: endDateObj ? Timestamp.fromDate(endDateObj) : null,
      frequency,
      proofRequired,
      status,
    };

    const reviewer = { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" };

    setSubmitting(true);
    try {
      if (initialTask) {
        await updateTaskAction(initialTask.id, input, reviewer);
      } else {
        await createTaskAction(input, reviewer);
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
        {isEditing ? `Edit "${initialTask?.title}"` : "Create a new task"}
      </h2>

      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldErrors.title}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldErrors.description && <p className="text-xs text-red-400">{fieldErrors.description}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Instructions</label>
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
        {fieldErrors.instructions && <p className="text-xs text-red-400">{fieldErrors.instructions}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Reward amount (Rs)"
          type="number"
          inputMode="decimal"
          value={rewardAmount}
          onChange={(event) => setRewardAmount(event.target.value)}
          error={fieldErrors.rewardAmount}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/80">Frequency</label>
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as TaskFrequency)}
            className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="one_time">One-time</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <FormField
          label="Start date"
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

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/80">Status</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
            className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 p-3">
        <p className="text-sm font-medium text-white/80">Package requirement</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={packageRuleMode}
            onChange={(event) => setPackageRuleMode(event.target.value as typeof packageRuleMode)}
            className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="any">Any active package</option>
            <option value="specific">Specific package</option>
            <option value="minimum">Minimum package price</option>
          </select>

          {packageRuleMode === "specific" && (
            <select
              value={requiredPackageId}
              onChange={(event) => setRequiredPackageId(event.target.value)}
              className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
            >
              <option value="">Select a package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          )}

          {packageRuleMode === "minimum" && (
            <input
              type="number"
              inputMode="decimal"
              placeholder="Minimum price (Rs)"
              value={minPackagePrice}
              onChange={(event) => setMinPackagePrice(event.target.value)}
              className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
            />
          )}
        </div>
        {fieldErrors.minPackagePrice && <p className="text-xs text-red-400">{fieldErrors.minPackagePrice}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={proofRequired}
          onChange={(event) => setProofRequired(event.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-surface-3 accent-brand"
        />
        Require a proof screenshot URL
      </label>

      <div className="flex gap-3">
        <Button type="submit" size="md" disabled={submitting}>
          {submitting ? <Spinner /> : isEditing ? "Save changes" : "Create task"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
