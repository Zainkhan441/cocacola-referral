"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/context/auth-provider";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import {
  FAQ_ITEMS,
  DEPOSIT_GUIDE,
  WITHDRAWAL_GUIDE,
  REFERRAL_GUIDE,
  PACKAGE_GUIDE,
  PLATFORM_RULES,
  type GuideStep,
} from "@/features/guide/content";

type SectionKey = "faq" | "deposit" | "withdrawal" | "referral" | "package" | "rules";

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "faq", label: "FAQ" },
  { key: "deposit", label: "Deposit guide" },
  { key: "withdrawal", label: "Withdrawal guide" },
  { key: "referral", label: "Referral guide" },
  { key: "package", label: "Package guide" },
  { key: "rules", label: "Rules" },
];

function StepsList({ steps }: { steps: GuideStep[] }) {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step) => (
        <div key={step.title} className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
          <p className="font-semibold text-white">{step.title}</p>
          <p className="mt-1 text-sm text-white/60">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function GuidePage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>("faq");

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
    }
  }, [configured, authLoading, user, router]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  const gateLoading = authLoading || !user || !user.emailVerified;

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
              <h1 className="text-2xl font-bold text-white">Guide & help center</h1>
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

            {section === "faq" && (
              <div className="flex flex-col gap-4">
                {FAQ_ITEMS.map((item) => (
                  <div key={item.question} className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
                    <p className="font-semibold text-white">{item.question}</p>
                    <p className="mt-1 text-sm text-white/60">{item.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {section === "deposit" && <StepsList steps={DEPOSIT_GUIDE} />}
            {section === "withdrawal" && <StepsList steps={WITHDRAWAL_GUIDE} />}
            {section === "referral" && <StepsList steps={REFERRAL_GUIDE} />}
            {section === "package" && <StepsList steps={PACKAGE_GUIDE} />}

            {section === "rules" && (
              <ul className="flex flex-col gap-3">
                {PLATFORM_RULES.map((rule, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 text-sm text-white/70 sm:p-5"
                  >
                    <span className="flex-shrink-0 font-bold text-brand-light">{index + 1}.</span>
                    {rule}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
