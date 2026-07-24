"use client";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { AccordionItem } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { usePublishedFaq } from "@/features/guide/hooks/use-published-faq";

// Reads the same admin-managed FAQ collection as the Guide & Help Center's
// FAQ tab (features/admin/lib/cms-seed.ts) — one source of truth, editable
// from Admin → Website → FAQ, no hardcoded questions here.
export function Faq() {
  const { items, loading, error, retry } = usePublishedFaq();

  return (
    <section id="faq" className="border-t border-white/10 bg-surface py-24">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Can’t find what you’re looking for? Sign in and check the Guide & Help Center for full details."
        />

        <div className="mx-auto w-full max-w-2xl">
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
              <Alert variant="error">{error}</Alert>
              <Button variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="text-center text-sm text-white/50">
              FAQ content hasn’t been published yet — check back soon.
            </p>
          )}

          {!loading &&
            !error &&
            items.map((item) => (
              <AccordionItem key={item.id} question={item.question} answer={item.answer} />
            ))}
        </div>
      </Container>
    </section>
  );
}
