"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { recoverMissingProfile } from "@/features/auth/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

type MissingProfileRecoveryProps = {
  onRetry: () => void;
};

// Shown when a signed-in, verified user has no Firestore profile — an Auth
// account exists but the profile documents were never created (or a prior
// signup was interrupted partway through, before profile creation was made
// atomic). Recovery creates only what's missing and never touches an
// existing document, so it's safe even if some of the profile did get
// created (see ensureUserProfile).
export function MissingProfileRecovery({ onRetry }: MissingProfileRecoveryProps) {
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);

  async function handleRecover() {
    if (recovering) return;
    setRecovering(true);
    setError(null);
    try {
      await recoverMissingProfile();
      setRecovered(true);
      onRetry();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setRecovering(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
      <Alert variant="info">
        We couldn’t find your profile. This can happen if your account
        signed up but setup didn’t finish. You can safely recreate the
        missing parts of your account below — this won’t affect anything
        that already exists.
      </Alert>
      {error && <Alert variant="error">{error}</Alert>}
      {recovered && !error && (
        <Alert variant="success">Profile recovered! Loading your dashboard…</Alert>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={recovering} onClick={handleRecover}>
          {recovering ? <Spinner /> : "Recover my profile"}
        </Button>
        <Button variant="outline" size="sm" disabled={recovering} onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
