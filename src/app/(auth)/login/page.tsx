"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { loginWithEmail } from "@/features/auth/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { validateEmail } from "@/features/auth/lib/validation";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const { configured } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!configured) {
    return (
      <AuthCard title="Welcome back" description="Log in to your account.">
        <FirebaseSetupNotice />
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: password ? undefined : "Password is required.",
    };
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      router.push("/dashboard");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Welcome back" description="Log in to your account.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-white/50 hover:text-white"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Spinner /> : "Log in"}
        </Button>

        <p className="text-center text-sm text-white/50">
          Don’t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-light hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
