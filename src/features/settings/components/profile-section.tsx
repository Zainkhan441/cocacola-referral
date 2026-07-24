"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { updateProfileAction } from "@/features/settings/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { UserDoc } from "@/lib/firestore/users";

type ProfileSectionProps = {
  profile: UserDoc;
};

export function ProfileSection({ profile }: ProfileSectionProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(profile.fullName);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isDirty = fullName.trim() !== profile.fullName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);
    setSuccess(false);

    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setFieldError("That name looks too short.");
      return;
    }
    setFieldError(null);

    setSubmitting(true);
    try {
      await updateProfileAction(user.uid, trimmed);
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
      <h2 className="text-sm font-semibold text-white">Profile</h2>

      {formError && <Alert variant="error">{formError}</Alert>}
      {success && <Alert variant="success">Profile updated.</Alert>}

      <FormField
        label="Full name"
        type="text"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        error={fieldError ?? undefined}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Email</label>
        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white/50">
          {profile.email}
        </p>
        <p className="text-xs text-white/40">
          Email address can’t be changed here — contact support if you need to update it.
        </p>
      </div>

      <Button type="submit" size="md" disabled={submitting || !isDirty} className="self-start">
        {submitting ? <Spinner /> : "Save changes"}
      </Button>
    </form>
  );
}
