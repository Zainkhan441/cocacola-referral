import { Lock, ClipboardCheck, Eye, UserCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const SECURITY_POINTS = [
  {
    icon: Lock,
    title: "Secure accounts",
    description:
      "Account access is protected with modern authentication safeguards.",
  },
  {
    icon: ClipboardCheck,
    title: "Manual deposit verification",
    description:
      "Every Easypaisa deposit screenshot is checked before funds are credited.",
  },
  {
    icon: Eye,
    title: "Transparent withdrawal requests",
    description: "Track every withdrawal request from submission to payout.",
  },
  {
    icon: UserCheck,
    title: "Admin-reviewed transactions",
    description:
      "A human reviews sensitive transactions — nothing moves silently.",
  },
];

export function Security() {
  return (
    <section className="py-24">
      <Container className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHeading
          align="left"
          eyebrow="Security & trust"
          title="Every transaction has a human checkpoint"
          description="We’d rather move a little slower and get it right than move fast and lose your trust."
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {SECURITY_POINTS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6"
            >
              <Icon className="h-5 w-5 text-brand-light" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">{title}</h3>
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
