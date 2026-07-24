"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { backfillTeamMembersAction, type BackfillResult } from "@/features/admin/lib/team-backfill-actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

export function TeamBackfillButton() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!user || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await backfillTeamMembersAction({
        adminUid: user.uid,
        adminName: user.displayName ?? user.email ?? "Admin",
      });
      setResult(outcome);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-white">Backfill team records</h2>
        <p className="text-xs text-white/50">
          One-time repair for referral relationships created before Team pages existed. Scans every
          user, walks their real referral chain, and fills in any missing team entries — never
          overwrites an existing one. Safe to run more than once.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {result && (
        <Alert variant="success">
          Scanned {result.usersScanned} user(s), created {result.recordsCreated} missing team
          record(s).
        </Alert>
      )}

      <Button variant="outline" size="sm" onClick={handleRun} disabled={running} className="self-start">
        {running ? <Spinner className="h-4 w-4" /> : "Run backfill"}
      </Button>
    </div>
  );
}
