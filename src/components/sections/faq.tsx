import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { AccordionItem } from "@/components/ui/accordion";
import { siteConfig } from "@/config/site";

const FAQS = [
  {
    question: `Is ${siteConfig.name} live?`,
    answer:
      "Yes — registration is open now. Create an account, verify your email, and you can browse packages and start referring right away.",
  },
  {
    question: "How do referral levels work?",
    answer:
      "You earn not just from people you refer directly, but from their referrals too — down to 12 levels deep, at reward rates set transparently by the platform.",
  },
  {
    question: "How do deposits work?",
    answer:
      "Deposits will be made via Easypaisa. You’ll upload a screenshot of your payment, and our team manually verifies it before crediting your wallet.",
  },
  {
    question: "How do withdrawals work?",
    answer:
      "You’ll submit a withdrawal request from your wallet. Our admin team reviews and processes it, and you can track its status throughout.",
  },
  {
    question: "Is my account secure?",
    answer:
      "Yes. Accounts are protected with modern authentication, and every sensitive transaction is reviewed before it’s finalized.",
  },
  {
    question: "Will there be mobile support?",
    answer: `Yes. ${siteConfig.name} is being built mobile-first so you can manage your wallet, referrals, and withdrawals from any device.`,
  },
  {
    question: "What happens to my data?",
    answer:
      "Your information is used only to operate your account and process transactions. We don’t sell personal data to third parties.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-white/10 bg-surface py-24">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Can’t find what you’re looking for? Sign in and check the Guide & Help Center for full details."
        />

        <div className="mx-auto w-full max-w-2xl">
          {FAQS.map((faq) => (
            <AccordionItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
