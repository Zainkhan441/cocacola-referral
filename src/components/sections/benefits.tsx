import {
  CalendarClock,
  Gift,
  ShieldCheck,
  ReceiptText,
  Headset,
  Smartphone,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { siteConfig } from "@/config/site";

const BENEFITS = [
  {
    icon: CalendarClock,
    title: "Daily earning opportunities",
    description:
      "New ways to earn every day, on top of your referral income.",
  },
  {
    icon: Gift,
    title: "Referral rewards",
    description: "Get rewarded for every person who joins through your link.",
  },
  {
    icon: ShieldCheck,
    title: "Secure wallet",
    description:
      "Your balance and transaction history, protected at every step.",
  },
  {
    icon: ReceiptText,
    title: "Transparent tracking",
    description:
      "Every deposit, referral, and withdrawal logged and easy to trace.",
  },
  {
    icon: Headset,
    title: "Fast support",
    description: "Real answers when you need them, without the runaround.",
  },
  {
    icon: Smartphone,
    title: "Mobile-friendly experience",
    description:
      "Manage your account comfortably from any device, anywhere.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="border-t border-white/10 bg-surface py-24">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={`Why ${siteConfig.name}`}
          title="Built for earners who value clarity"
          description="Every feature is designed around one idea: you should always know exactly where your money is."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-6 transition-colors duration-300 hover:border-brand/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15">
                <Icon className="h-5 w-5 text-brand-light" aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold text-white">{title}</h3>
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
