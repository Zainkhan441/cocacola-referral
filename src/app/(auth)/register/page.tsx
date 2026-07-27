"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/context/auth-provider";
import { registerWithEmail } from "@/features/auth/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import {
  validateName,
  validateEmail,
  validateMobileNumber,
  validatePassword,
  validateConfirmPassword,
} from "@/features/auth/lib/validation";

type FieldErrors = {
  name?: string;
  email?: string;
  mobileNumber?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Create your account" description="Join us and start earning.">
          <div className="flex justify-center py-6">
            <Spinner className="h-6 w-6" />
          </div>
        </AuthCard>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { configured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!configured) {
    return (
      <AuthCard
        title="Create your account"
        description="Join us and start earning."
      >
        <FirebaseSetupNotice />
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors: FieldErrors = {
      name: validateName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      mobileNumber: validateMobileNumber(mobileNumber) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirmPassword:
        validateConfirmPassword(password, confirmPassword) ?? undefined,
    };
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail(name, email, mobileNumber, password, referralCode);
      router.push("/packages");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Join us and start earning."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {referralCode && (
          <Badge className="mx-auto">Referred by {referralCode}</Badge>
        )}

        <FormField
          label="Full name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors.name}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <FormField
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          placeholder="03XXXXXXXXX"
          value={mobileNumber}
          onChange={(event) => setMobileNumber(event.target.value)}
          error={fieldErrors.mobileNumber}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors.confirmPassword}
        />

        <Button type="submit" size="lg" disabled={submitting} className="mt-2">
          {submitting ? <Spinner /> : "Create account"}
        </Button>

        <p className="text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-light hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
