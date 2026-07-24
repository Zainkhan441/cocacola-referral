import Link from "next/link";
import { ShieldCheck, Wallet, Users, Headset } from "lucide-react";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { HeroDashboardMockup } from "@/components/sections/hero-dashboard-mockup";

const TRUST_INDICATORS = [
  { icon: ShieldCheck, label: "Secure by design" },
  { icon: Wallet, label: "Transparent payouts" },
  { icon: Users, label: "12-level referral network" },
  { icon: Headset, label: "Real support, real people" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-brand/20 blur-3xl"
      />

      <Container className="relative grid items-center gap-16 lg:grid-cols-2">
        <div className="flex animate-fade-in-up flex-col items-start gap-6 text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
            Referral &amp; Earning Platform
          </span>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Turn your network into a{" "}
            <span className="text-brand-light">daily income stream</span>
          </h1>

          <p className="max-w-lg text-lg text-white/60">
            Join a referral platform built for real earnings — pick a package,
            invite your circle, and track every rupee from referral to
            withdrawal in one transparent wallet.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get Started
            </Link>
            <a
              href="#how-it-works"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              See How It Works
            </a>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {TRUST_INDICATORS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon
                  className="h-4 w-4 flex-shrink-0 text-brand-light"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-white/60">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <HeroDashboardMockup />
      </Container>
    </section>
  );
}
