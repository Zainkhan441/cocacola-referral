"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useTaskRewardSettings } from "@/features/admin/hooks/use-task-reward-settings";
import { updateTaskRewardSettingsAction } from "@/features/admin/lib/task-reward-actions";
import { validateTaskRewardPerAd } from "@/features/admin/lib/task-reward-validation";
import { DEFAULT_TASK_REWARD_PER_AD } from "@/lib/firestore/settings";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

export function TaskRewardSettingsForm() {
  const { user } = useAuth();
  const { settings, loading, error, retry } = useTaskRewardSettings();

  return loading ? (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : error ? (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
      <Alert variant="error">{error}</Alert>
      <Button variant="outline" size="sm" onClick={retry}>
        Retry
      </Button>
    </div>
  ) : (
    <TaskRewardSettingsFormFields
      key={settings ? "loaded" : "empty"}
      initial={settings}
      adminUid={user?.uid}
      adminName={user?.displayName ?? user?.email ?? "Admin"}
    />
  );
}

type TaskRewardSettingsFormFieldsProps = {
  initial: ReturnType<typeof useTaskRewardSettings>["settings"];
  adminUid: string | undefined;
  adminName: string;
};

function TaskRewardSettingsFormFields({ initial, adminUid, adminName }: TaskRewardSettingsFormFieldsProps) {
  const [rewardPerAd, setRewardPerAd] = useState(
    String(initial?.rewardPerAd ?? DEFAULT_TASK_REWARD_PER_AD),
  );

  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !adminUid) return;
    setFormError(null);
    setSuccess(false);

    const error = validateTaskRewardPerAd(rewardPerAd) ?? undefined;
    setFieldError(error);
    if (error) return;

    setSubmitting(true);
    try {
      await updateTaskRewardSettingsAction(
        { rewardPerAd: Number(rewardPerAd.trim()) },
        { adminUid, adminName },
      );
      setSuccess(true);
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
      <h2 className="text-sm font-semibold text-white">Task Reward Settings</h2>
      <p className="text-sm text-white/50">
        This single reward applies to every active, existing, and future ad-watch task. Changing it
        takes effect immediately for all users.
      </p>

      {formError && <Alert variant="error">{formError}</Alert>}
      {success && <Alert variant="success">Saved.</Alert>}

      <FormField
        label="Task Reward per Ad (Rs)"
        type="number"
        inputMode="decimal"
        value={rewardPerAd}
        onChange={(event) => setRewardPerAd(event.target.value)}
        error={fieldError}
        className="sm:max-w-xs"
      />

      <Button type="submit" size="md" disabled={submitting} className="self-start">
        {submitting ? <Spinner /> : "Save Reward Setting"}
      </Button>
    </form>
  );
}
