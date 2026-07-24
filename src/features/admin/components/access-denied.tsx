import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
      <ShieldAlert className="h-10 w-10 text-brand-light" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-white">Access denied</h1>
      <p className="max-w-sm text-sm text-white/60">
        You don’t have permission to view this page. This area is restricted
        to administrator accounts.
      </p>
      <Link href="/dashboard">
        <Button variant="outline" size="sm">
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
