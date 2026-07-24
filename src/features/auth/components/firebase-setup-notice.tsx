import { AlertTriangle } from "lucide-react";

export function FirebaseSetupNotice() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand/30 bg-surface-3 p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-brand-light" aria-hidden="true" />
      <p className="text-sm font-semibold text-white">Firebase setup required</p>
      <p className="text-sm leading-relaxed text-white/60">
        Authentication isn’t connected yet. Add your Firebase project
        credentials to{" "}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-white/80">
          .env.local
        </code>{" "}
        to enable registration and login.
      </p>
    </div>
  );
}
