"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { useAppAccessGate } from "@/features/auth/hooks/use-app-access-gate";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { usePublishedFaq } from "@/features/guide/hooks/use-published-faq";
import { usePublishedGuideSteps } from "@/features/guide/hooks/use-published-guide-steps";
import { usePublishedRules } from "@/features/guide/hooks/use-published-rules";
import type { CmsGuideCategory } from "@/lib/firestore/cms-guides";

type SectionKey = "faq" | "deposit" | "withdrawal" | "referral" | "package" | "rules";

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "faq", label: "FAQ" },
  { key: "deposit", label: "Deposit guide" },
  { key: "withdrawal", label: "Withdrawal guide" },
  { key: "referral", label: "Referral guide" },
  { key: "package", label: "Package guide" },
  { key: "rules", label: "Rules" },
];

function GuideStepsPanel({ category }: { category: CmsGuideCategory }) {
  const { steps, loading, error, retry } = usePublishedGuideSteps(category);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
      </div>
    );
  }
  if (steps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
        <p className="text-sm text-white/50">This guide hasn’t been published yet.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step) => (
        <div key={step.id} className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
          <p className="font-semibold text-white">{step.title}</p>
          <p className="mt-1 text-sm text-white/60">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

function FaqPanel() {
  const { items, loading, error, retry } = usePublishedFaq();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
        <p className="text-sm text-white/50">No FAQ items have been published yet.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
          <p className="font-semibold text-white">{item.question}</p>
          <p className="mt-1 text-sm text-white/60">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}

function RulesPanel() {
  const { rules, loading, error, retry } = usePublishedRules();

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
      </div>
    );
  }
  if (rules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
        <p className="text-sm text-white/50">No rules have been published yet.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {rules.map((rule, index) => (
        <li key={rule.id} className="flex gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 text-sm text-white/70 sm:p-5">
          <span className="flex-shrink-0 font-bold text-brand-light">{index + 1}.</span>
          {rule.text}
        </li>
      ))}
    </ul>
  );
}

export default function GuidePage() {
  const { user, loading: authLoading, configured } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { gateLoading } = useAppAccessGate({ configured, authLoading, user, profile, profileLoading });
  const [section, setSection] = useState<SectionKey>("faq");

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && (
          <>
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Guide & help center</h1>
              </div>
              <p className="text-sm text-white/50">
                Everything you need to know about earning, referring, and getting paid.
              </p>
            </div>

            <div className="flex gap-1 overflow-x-auto">
              {SECTIONS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setSection(entry.key)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    section === entry.key
                      ? "bg-brand text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {section === "faq" && <FaqPanel />}
            {section === "deposit" && <GuideStepsPanel category="deposit" />}
            {section === "withdrawal" && <GuideStepsPanel category="withdrawal" />}
            {section === "referral" && <GuideStepsPanel category="referral" />}
            {section === "package" && <GuideStepsPanel category="package" />}
            {section === "rules" && <RulesPanel />}
          </>
        )}
      </main>
    </div>
  );
}
