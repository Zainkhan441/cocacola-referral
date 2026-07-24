"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import {
  checkEmailVerified,
  resendVerificationEmail,
} from "@/features/auth/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { auth } from "@/lib/firebase/client";

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Verify your email">
          <div className="flex justify-center py-6">
            <Spinner className="h-6 w-6" />
          </div>
        </AuthCard>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Present only when the user arrived via the emailed action link
  // (handleCodeInApp: true sends these straight to this page instead of
  // Firebase's hosted handler — see verifyEmailActionCodeSettings).
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");
  const apiKey = searchParams.get("apiKey");
  const isActionLink = Boolean(mode && oobCode);

  // Validity of the link itself (mode/apiKey) is derivable straight from
  // the URL on every render — no state needed, and nothing to set inside
  // an effect for it. Only the actual applyActionCode() call is
  // asynchronous, so that's the only thing state tracks.
  const linkValidationError = !isActionLink
    ? null
    : mode !== "verifyEmail"
      ? "This link is invalid or has already been used."
      : apiKey && apiKey !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY
        ? "This verification link doesn’t belong to this app."
        : null;

  const [linkResult, setLinkResult] = useState<"success" | "error" | null>(null);
  const [linkResultError, setLinkResultError] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Apply the action code ourselves — that's the whole point of
  // handleCodeInApp: true. Every state update below happens inside the
  // promise callbacks (an external async operation resolving), never
  // synchronously in the effect body itself.
  useEffect(() => {
    if (!configured || !oobCode || linkValidationError || !auth) return;
    const authInstance = auth;

    let cancelled = false;
    applyActionCode(authInstance, oobCode)
      .then(async () => {
        if (authInstance.currentUser) {
          await checkEmailVerified().catch(() => {});
        }
        if (!cancelled) {
          setLinkResult("success");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLinkResultError(getAuthErrorMessage(err));
          setLinkResult("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [configured, oobCode, linkValidationError]);

  const processingLink = isActionLink && !linkValidationError && linkResult === null;
  const linkError = linkValidationError ?? linkResultError;
  const linkSuccess = linkResult === "success";

  // Same browser/session as the signup → dashboard is verified and ready.
  // A different device/browser than the one that signed up → not
  // signed in here, so send them to log in instead.
  useEffect(() => {
    if (!linkSuccess) return;
    const timeout = setTimeout(() => {
      router.replace(auth?.currentUser ? "/dashboard" : "/login");
    }, 1500);
    return () => clearTimeout(timeout);
  }, [linkSuccess, router]);

  useEffect(() => {
    if (!configured || loading || isActionLink) return;
    if (!user) {
      router.replace("/login");
    }
  }, [configured, loading, user, router, isActionLink]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!configured) {
    return (
      <AuthCard title="Verify your email">
        <FirebaseSetupNotice />
      </AuthCard>
    );
  }

  if (isActionLink) {
    return (
      <AuthCard title="Verify your email">
        {processingLink && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner className="h-6 w-6" />
            <p className="text-sm text-white/60">Verifying your email…</p>
          </div>
        )}
        {!processingLink && linkSuccess && (
          <Alert variant="success">Your email is verified! Redirecting…</Alert>
        )}
        {!processingLink && linkError && (
          <div className="flex flex-col gap-4">
            <Alert variant="error">{linkError}</Alert>
            <Button size="lg" onClick={() => router.push("/login")}>
              Back to login
            </Button>
          </div>
        )}
      </AuthCard>
    );
  }

  if (loading || !user) {
    return (
      <AuthCard title="Verify your email">
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6" />
        </div>
      </AuthCard>
    );
  }

  async function handleResend() {
    setError(null);
    setMessage(null);
    setResending(true);
    try {
      await resendVerificationEmail();
      setMessage("Verification email sent again. Check your inbox.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  async function handleCheckVerified() {
    setError(null);
    setMessage(null);
    setChecking(true);
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        router.push("/dashboard");
      } else {
        setMessage("Still not verified yet. Please check your inbox.");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      description={`We sent a verification link to ${user.email ?? "your email"}.`}
    >
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <Button onClick={handleCheckVerified} size="lg" disabled={checking}>
          {checking ? <Spinner /> : "I’ve verified my email"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending ? (
            <Spinner />
          ) : cooldown > 0 ? (
            `Resend available in ${cooldown}s`
          ) : (
            "Resend verification email"
          )}
        </Button>
      </div>
    </AuthCard>
  );
}
