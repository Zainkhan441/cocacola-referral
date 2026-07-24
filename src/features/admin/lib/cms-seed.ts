import { getDocs, limit, query } from "firebase/firestore";
import type { Firestore, Query } from "firebase/firestore";
import { cmsFaqCollection, createCmsFaqItem } from "@/lib/firestore/cms-faq";
import { cmsGuideStepsCollection, createCmsGuideStep, type CmsGuideCategory } from "@/lib/firestore/cms-guides";
import { cmsRulesCollection, createCmsRule } from "@/lib/firestore/cms-rules";
import { cmsLinksCollection, createCmsLink, type CmsLinkPlacement } from "@/lib/firestore/cms-links";

// One-time, idempotent migration of this app's real, already-accurate
// FAQ/guide/rules/navigation content (previously hardcoded in
// features/guide/content.ts and constants/nav.ts) into the new
// admin-editable CMS collections. These are seed DEFAULTS only — every
// value here is fully admin-editable going forward via the Website
// Management admin pages, exactly like Milestone 11's default referral
// rates. Each function is a no-op if its collection already has any
// documents, so it's safe to call on every admin page load.

async function isCollectionEmpty<T>(coll: Query<T>) {
  const snapshot = await getDocs(query(coll, limit(1)));
  return snapshot.empty;
}

export async function seedDefaultFaqIfEmpty(db: Firestore): Promise<void> {
  if (!(await isCollectionEmpty(cmsFaqCollection(db)))) return;

  const defaults: Array<{ question: string; answer: string }> = [
    {
      question: "How do I start earning?",
      answer:
        "Purchase an active package from the Packages page. Every earning path on this platform — daily claims, tasks, and referral/bonus payouts — requires you to have an active, unexpired package.",
    },
    {
      question: "Why is my deposit or withdrawal still pending?",
      answer:
        "Every deposit and withdrawal is manually reviewed by an admin before it’s approved and credited. There’s no fixed review time — check the Deposit/Withdrawal history on your Dashboard for the current status.",
    },
    {
      question: "Why can’t I claim my daily earning?",
      answer:
        "Daily claims are limited to once every 24 hours per account, and require an active, unexpired package with daily claims currently enabled. The Dashboard shows a live countdown until your next claim opens.",
    },
    {
      question: "Do I need to buy a package to refer people?",
      answer:
        "No — anyone can share their referral link and sign people up. But to actually earn a referral reward when someone in your downline purchases a package, you yourself need an active, unexpired package at the moment their purchase is approved.",
    },
    {
      question: "What happens to my old package when I buy a new one?",
      answer:
        "Packages are always fresh: buying a new package immediately replaces your current one. Activation starts at approval time and runs for the new package’s full duration — no remaining time from the old package carries over or stacks.",
    },
    {
      question: "Why was my task submission rejected?",
      answer:
        "An admin reviews every task submission before crediting the reward. If your response or proof didn’t satisfy the task’s instructions, it may be rejected — you can still complete other available tasks, or the same one again once eligible (one-time tasks can only be completed once per account; daily tasks reopen after 24 hours).",
    },
  ];

  for (let i = 0; i < defaults.length; i++) {
    await createCmsFaqItem(db, { ...defaults[i], order: i, isPublished: true });
  }
}

export async function seedDefaultGuidesIfEmpty(db: Firestore): Promise<void> {
  if (!(await isCollectionEmpty(cmsGuideStepsCollection(db)))) return;

  const byCategory: Record<CmsGuideCategory, Array<{ title: string; body: string }>> = {
    deposit: [
      {
        title: "1. Choose top-up or package purchase",
        body: 'From your Dashboard, use "Request a deposit" for a plain wallet top-up (Rs 500–100,000), or go to the Packages page to purchase a specific package — its amount is fixed to that package’s price.',
      },
      {
        title: "2. Send payment and submit your reference",
        body: "Pay via Easypaisa, then submit the request with your transaction/reference ID. A proof screenshot URL is optional for a top-up.",
      },
      {
        title: "3. Wait for admin review",
        body: 'Your request appears as "pending" in your Deposit history. An admin verifies the payment and approves or rejects it — you can only have one pending package-purchase request at a time.',
      },
      {
        title: "4. Funds or package are credited",
        body: "A top-up adds directly to your wallet balance. A package purchase instead activates that package immediately upon approval, replacing any previous package.",
      },
    ],
    withdrawal: [
      {
        title: "1. Make sure you qualify",
        body: "You need an active, unexpired package and at least Rs 500 in your wallet balance to request a withdrawal.",
      },
      {
        title: "2. Know your per-request limit",
        body: "Each package sets its own maximum withdrawal amount per request — shown on your Dashboard’s withdrawal form before you submit.",
      },
      {
        title: "3. Submit your request",
        body: "Provide your Easypaisa account title and number along with the amount. The amount is held against your balance until reviewed.",
      },
      {
        title: "4. Admin review and payout",
        body: "An admin verifies and approves or rejects the request. Approved withdrawals are paid out to the account details you provided.",
      },
    ],
    referral: [
      {
        title: "Your referral link",
        body: "Find your unique referral link and code on the Dashboard or Team page. Anyone who signs up through it becomes your level-1 (direct) referral.",
      },
      {
        title: "12 levels deep",
        body: "Your network extends up to 12 levels: your direct referrals are level 1, their referrals are level 2, and so on. The Team page shows your total team, active team, and a level-by-level breakdown.",
      },
      {
        title: "When rewards are paid",
        body: "A referral reward is paid only when someone in your downline has a package purchase approved by an admin — never for signing up alone.",
      },
      {
        title: "Staying qualified",
        body: "To receive a reward at any level, you must have your own active, unexpired, enabled package at the exact moment that downline purchase is approved. If you don’t qualify, that level’s reward is simply skipped — it is not paid to anyone else instead.",
      },
      {
        title: "Rates are admin-configured",
        body: "Each of the 12 levels has its own reward rate (a percentage of the purchased package’s price, or a fixed amount), set by the platform admin and shown transparently — never hidden or hardcoded.",
      },
    ],
    package: [
      {
        title: "Browse packages",
        body: "The Packages page lists every available package with its price, daily earning rate, withdrawal limits, duration, and features.",
      },
      {
        title: "One active package at a time",
        body: "You can only have one active package. Purchasing a new one always replaces your current package — “always fresh” activation, never stacked.",
      },
      {
        title: "What a package unlocks",
        body: "Your package determines your daily earning amount, your per-request and daily withdrawal limits, and your eligibility for package-restricted tasks and referral/bonus qualification.",
      },
      {
        title: "Expiry",
        body: "Every package runs for a fixed number of days from activation. Once it expires, daily claims, withdrawals, and referral qualification pause until you renew or upgrade.",
      },
    ],
  };

  for (const category of Object.keys(byCategory) as CmsGuideCategory[]) {
    const steps = byCategory[category];
    for (let i = 0; i < steps.length; i++) {
      await createCmsGuideStep(db, { category, ...steps[i], order: i, isPublished: true });
    }
  }
}

export async function seedDefaultRulesIfEmpty(db: Firestore): Promise<void> {
  if (!(await isCollectionEmpty(cmsRulesCollection(db)))) return;

  const defaults: string[] = [
    "One account per person. Do not create multiple accounts to claim multiple referral bonuses or daily earnings.",
    "All deposits and withdrawals must include an accurate transaction/reference ID. Submitting false payment proof may result in account suspension.",
    "Task submissions must genuinely reflect the task’s instructions. Submitting false or copied proof may result in rejection and account review.",
    "Referral rewards and salary/level bonuses are paid only for real, organic referrals — not for self-referrals or fabricated team activity.",
    "An account found violating these rules may have its accountStatus set to suspended or banned by an admin, which pauses earning and withdrawal ability.",
    "Package purchases are final once approved and activated; packages are not refundable.",
  ];

  for (let i = 0; i < defaults.length; i++) {
    await createCmsRule(db, { text: defaults[i], order: i, isPublished: true });
  }
}

export async function seedDefaultNavLinksIfEmpty(db: Firestore): Promise<void> {
  if (!(await isCollectionEmpty(cmsLinksCollection(db)))) return;

  const byPlacement: Record<CmsLinkPlacement, Array<{ label: string; url: string }>> = {
    header: [
      { label: "Home", url: "#top" },
      { label: "How It Works", url: "#how-it-works" },
      { label: "Packages", url: "#packages" },
      { label: "Benefits", url: "#benefits" },
      { label: "FAQ", url: "#faq" },
    ],
    footer_nav: [
      { label: "Home", url: "#top" },
      { label: "How It Works", url: "#how-it-works" },
      { label: "Packages", url: "#packages" },
      { label: "Benefits", url: "#benefits" },
      { label: "FAQ", url: "#faq" },
    ],
    footer_legal: [],
    footer_support: [],
  };

  for (const placement of Object.keys(byPlacement) as CmsLinkPlacement[]) {
    const links = byPlacement[placement];
    for (let i = 0; i < links.length; i++) {
      await createCmsLink(db, { placement, ...links[i], order: i, isPublished: true });
    }
  }
}
