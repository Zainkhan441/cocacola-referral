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
        "Purchase a package from the Packages page. Every earning path on this platform — daily ad tasks and referral/bonus payouts — requires you to currently hold an active package.",
    },
    {
      question: "Why is my deposit or withdrawal still pending?",
      answer:
        "Every package purchase and withdrawal is manually reviewed by an admin before it’s approved. There’s no fixed review time — check the Packages page for your purchase status, or the Wallet page’s Withdraw history for withdrawal status.",
    },
    {
      question: "Why can’t I claim my daily earning?",
      answer:
        "You need to complete all of today’s assigned ad-watch tasks first. Once every required ad is done, your reward — the sum of each ad’s task reward plus your package’s daily earning — unlocks once per Pakistan calendar day, either via the \"Claim Reward\" button or automatically if you’ve enabled Auto Balance.",
    },
    {
      question: "Do I need to buy a package to refer people?",
      answer:
        "No — anyone can share their referral link and sign people up. But to actually earn a referral reward when someone in your downline purchases a package, you yourself need to currently hold an active package at the moment their purchase is approved.",
    },
    {
      question: "What happens to my old package when I buy a new one?",
      answer:
        "Packages are always fresh: buying a new package immediately replaces your current one, activating at approval time. Packages never expire, so there’s no remaining time from the old package to carry over — the new one simply takes over completely.",
    },
    {
      question: "How do daily ad tasks work?",
      answer:
        "Each day you’re assigned a small set of ad-watch tasks sized to your package. Watching an ad to completion (a genuine, real-time watch — no admin review needed) marks that task done. Your assigned tasks reset automatically at Pakistan midnight, and completing all of them unlocks that day’s reward.",
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
        title: "1. Choose a package",
        body: "Go to the Packages page and choose a package to purchase — its amount is fixed to that package’s price. There is no separate top-up option; every deposit is a package purchase.",
      },
      {
        title: "2. Send payment and submit your reference",
        body: "Pay via Easypaisa, then submit the request with your transaction/reference ID and a proof screenshot.",
      },
      {
        title: "3. Wait for admin review",
        body: 'Your request appears as "pending" in your Wallet history. An admin verifies the payment and approves or rejects it — you can only have one pending package-purchase request at a time.',
      },
      {
        title: "4. Package is activated",
        body: "Once approved, your package activates immediately, replacing any previous package. Your daily ad tasks and Coca-Cola Earning begin the next Pakistan day.",
      },
    ],
    withdrawal: [
      {
        title: "1. Make sure you qualify",
        body: "Current Balance withdrawals need at least the platform’s minimum amount. Coca-Cola Earning withdrawals instead require reaching an admin-selected CocaCola Level, based on your active direct referrals — both shown live on the Wallet page.",
      },
      {
        title: "2. Know the required Level for Coca-Cola Earning",
        body: "There is no per-package withdrawal limit. The Wallet page shows exactly how many more active direct referrals you need to reach the required Level and unlock Coca-Cola Earning withdrawals.",
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
        body: "To receive a reward at any level, you must currently hold an active package at the exact moment that downline purchase is approved. If you don’t qualify, that level’s reward is simply skipped — it is not paid to anyone else instead.",
      },
      {
        title: "Rates are admin-configured",
        body: "Each of the 12 levels has its own reward rate (a percentage of the purchased package’s price, or a fixed amount), set by the platform admin and shown transparently — never hidden or hardcoded.",
      },
    ],
    package: [
      {
        title: "Browse packages",
        body: "The Packages page lists every available package with its price, daily earning rate, daily ad-task count, and referral commission rate.",
      },
      {
        title: "One package, forever",
        body: "You can only have one active package at a time, and packages never expire. Purchasing a new one always replaces your current package — “always fresh” activation, never stacked, never upgraded.",
      },
      {
        title: "What a package unlocks",
        body: "Your package determines your daily ad-task count, your daily Coca-Cola Earning amount, and your eligibility for package-restricted tasks and referral/bonus qualification.",
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
    "Ad tasks must be watched genuinely and attentively. Attempting to bypass or automate the watch-time requirement may result in account review.",
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
