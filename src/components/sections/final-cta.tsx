import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function FinalCta() {
  return (
    <section className="py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-2 px-8 py-16 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-brand/25 blur-3xl"
          />

          <div className="relative flex flex-col items-center gap-6">
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Be first in line when {siteConfig.name} opens its doors
            </h2>
            <p className="max-w-lg text-white/60">
              Explore the packages, see how referrals pay out across 12
              levels, and get a feel for the platform before everyone else
              does.
            </p>
            <a href="#packages" className={buttonVariants({ size: "lg" })}>
              Explore packages
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
