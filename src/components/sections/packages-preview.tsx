import Link from "next/link";
import { Check, Star } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PACKAGES = [
  {
    name: "Starter",
    price: "Rs 1,000",
    description: "A low-cost entry point to try the platform and start referring.",
    features: ["Referral link access", "Daily earning tasks", "Level 1–3 rewards"],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "Rs 5,000",
    description: "For members ready to build a wider referral network.",
    features: ["Everything in Starter", "Higher earning caps", "Level 1–6 rewards"],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "Rs 15,000",
    description: "Our largest package for serious, high-volume referrers.",
    features: ["Everything in Growth", "Priority support", "Level 1–12 rewards"],
    highlighted: false,
  },
];

export function PackagesPreview() {
  return (
    <section id="packages" className="py-24">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Packages"
          title="A package for every level of ambition"
          description="Here’s how packages are structured. Sign in to see live pricing and pick the one that fits you."
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={cn(
                "relative flex flex-col gap-6 rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-1",
                pkg.highlighted
                  ? "border-brand/50 bg-surface-2 shadow-xl shadow-brand/10"
                  : "border-white/10 bg-surface-2",
              )}
            >
              {pkg.highlighted && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
                  <Star className="h-3 w-3" aria-hidden="true" />
                  Most popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                <p className="mt-2 text-3xl font-bold text-white">{pkg.price}</p>
              </div>

              <p className="text-sm text-white/60">{pkg.description}</p>

              <ul className="flex flex-1 flex-col gap-3">
                {pkg.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-light"
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={buttonVariants({ variant: "outline", size: "md", className: "w-full justify-center" })}
              >
                Select package
              </Link>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
