import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);

export function ReferralLevels() {
  return (
    <section className="border-t border-white/10 bg-surface py-24">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Referral network"
          title="Earn across up to 12 referral levels"
          description="Your network doesn’t stop at direct referrals. As it grows deeper, you keep earning from every level beneath you, all the way to level 12."
        />

        <div
          aria-hidden="true"
          className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12"
        >
          {LEVELS.map((level) => {
            const intensity = 1 - (level - 1) * 0.06;
            return (
              <div
                key={level}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/10 p-4 transition-transform duration-300 hover:-translate-y-1"
                style={{ backgroundColor: `rgba(224, 18, 48, ${intensity * 0.35})` }}
              >
                <span className="text-lg font-bold text-white">{level}</span>
                <span className="text-[10px] uppercase tracking-wide text-white/50">
                  Lvl
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-white/50">
          Levels 1 through 12 — every level pays out for real, at rates set
          transparently by the platform.
        </p>
      </Container>
    </section>
  );
}
