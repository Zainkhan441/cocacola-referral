"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PasswordField } from "@/components/ui/password-field";
import { changePasswordAction } from "@/features/settings/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    setSuccess(false);

    const errors: FieldErrors = {
      currentPassword: currentPassword ? undefined : "Enter your current password.",
      newPassword:
        newPassword.length >= 8 ? undefined : "New password must be at least 8 characters.",
      confirmPassword:
        confirmPassword === newPassword ? undefined : "Passwords don’t match.",
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await changePasswordAction(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      <h2 className="text-sm font-semibold text-white">Password</h2>

      {formError && <Alert variant="error">{formError}</Alert>}
      {success && <Alert variant="success">Password changed.</Alert>}

      <PasswordField
        label="Current password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        error={fieldErrors.currentPassword}
      />
      <PasswordField
        label="New password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        error={fieldErrors.newPassword}
      />
      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={fieldErrors.confirmPassword}
      />

      <Button type="submit" size="md" disabled={submitting} className="self-start">
        {submitting ? <Spinner /> : "Change password"}
      </Button>
    </form>
  );
}
