"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { requestPasswordReset } from "@/features/auth/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { validateEmail } from "@/features/auth/lib/validation";

export default function ForgotPasswordPage() {
  const { configured } = useAuth();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!configured) {
    return (
      <AuthCard
        title="Reset your password"
        description="We’ll email you a reset link."
      >
        <FirebaseSetupNotice />
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const error = validateEmail(email);
    setFieldError(error ?? undefined);
    if (error) return;

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (submitError) {
      setFormError(getAuthErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      description="We’ll email you a reset link."
    >
      <div className="flex flex-col gap-4">
        {sent ? (
          <Alert variant="success">
            If an account exists for {email}, a password reset link is on its
            way.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {formError && <Alert variant="error">{formError}</Alert>}

            <FormField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldError}
            />

            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <Spinner /> : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-white/50">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-brand-light hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
