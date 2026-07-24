import { UserPlus, Package, Share2, Wallet } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const STEPS = [
  {
    icon: UserPlus,
    title: "Register",
    description:
      "Create your account in minutes and set up your profile to get started.",
  },
  {
    icon: Package,
    title: "Choose a package",
    description:
      "Pick the package that matches your goals from a clear, transparent lineup.",
  },
  {
    icon: Share2,
    title: "Refer and earn",
    description:
      "Share your referral link and earn as your network grows across every level.",
  },
  {
    icon: Wallet,
    title: "Withdraw earnings",
    description:
      "Request a withdrawal any time and track it through to your wallet.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps to your first payout"
          description="A straightforward path from sign-up to your first withdrawal — no guesswork."
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand-light">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon
                  className="h-5 w-5 text-white/40 transition-colors group-hover:text-brand-light"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/60">
                {description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
