# Reference Platform Analysis — "GEC-style" Task/Referral Earning App

**Purpose:** Background research to plan the remaining screens/flows for our Coca-Cola
platform (Work Room, Level progression, Salary/Bonus, navigation polish). This document
analyzes the **business and UX model** of a publicly known reference platform in this app
genre. It does not reproduce any of that platform's code, copy, branding, logos, or
assets — everything below is either (a) generic, industry-standard behavior for this
class of app, or (b) explicitly marked as unverified/inferred.

---

## 0. Sourcing note & a required risk disclosure

The reference site's own homepage is a bare login screen — every feature described below
sits behind authentication, so it could not be crawled directly. This document is
therefore built from three sources, each labeled inline:

- **[Confirmed]** — stated directly in public reviews/press about the reference platform.
- **[Genre-standard]** — not confirmed for this specific site, but standard practice
  across the entire category of task/referral/deposit earning apps (a category I have
  broad training knowledge of).
- **[Our existing rule]** — a business rule your own platform already implements
  (established across Milestones 9–19), which this reference platform likely inspired
  originally.

**⚠️ Important, before going further:** multiple independent public reviews of the
reference platform — including a detailed Trustpilot warning — describe it as an
**alleged Ponzi-style scheme**: no verifiable company registration or official brand
affiliation, a "deposit-to-withdraw" pattern where displayed earnings are claimed to be
unbacked numbers, and reports of withdrawal requests being blocked or gated behind
after-the-fact "verification fees." I'm not asserting your platform has any of these
problems — you've been explicit throughout this project about audit trails,
admin-configurable rates, and no hidden fees — but the *structural* shape being copied
(referral commissions paid out of new depositors' money, packages priced well above any
described product cost) is the same shape regulators and reviewers flag as unsustainable
regardless of branding. Two things worth deciding explicitly, not by default:
1. Is there a real external revenue source funding commissions/earnings (ad revenue,
   an actual Coca-Cola marketing/loyalty budget, real product sales), or are payouts
   funded purely by newer users' deposits? The second is the pattern reviewers call a
   Ponzi structure no matter how the UI is branded.
2. Withdrawals should never require the user to pay anything first ("verification fee,"
   "tax," etc.) — your platform doesn't do this today, and it shouldn't start.

I'll proceed with the UX/structure research you asked for below; I'm flagging this once,
clearly, so it's a decision you make on purpose rather than one that arrives by default
because it matches the reference app.

---

## 1. Complete user journey (registration → earning)

1. **Landing/marketing page** (logged-out) → Register.
2. **Registration**: name, email/phone, password, referral code (optional but
   pre-filled if arriving via a referral link). `[Our existing rule]`
3. **Email/phone verification** gate before the dashboard unlocks. `[Our existing rule]`
4. **Empty-state dashboard**: no package yet, Rs 0 everywhere, a prominent
   "Buy a package to start earning" call to action. `[Genre-standard]`
5. **Browse packages** → pick one → shown the deposit/payment instructions (bank/mobile
   wallet account details) → submit reference ID + proof screenshot. `[Our existing rule]`
6. **Pending state**: deposit shows "pending review," user is told to wait; some apps
   show an estimated review time (e.g. "usually within 24h"). `[Genre-standard]`
7. **Admin approves** → package activates → user gets a notification → the dashboard's
   wallet/wait states flip to "active." `[Our existing rule, notification added M18]`
8. **Daily ritual begins**: the user opens the app once a day, does two things —
   (a) collects the day's automatic package earning, (b) completes that package's
   task quota in the "Work Room." `[Genre-standard behavior; our automatic-crediting
   half is already built, our Work Room framing is not]`
9. **Team building**: user shares their referral link/code; as referrals join and buy
   packages, commissions land automatically and the user's "Level" rises. `[Our existing
   rule for the commission half; Level is enforced but not yet a first-class UI]`
10. **Milestone rewards**: hitting team-size/Level thresholds unlocks recurring
    "salary" payouts or one-off bonuses. `[Our existing rule — Bonus Tiers/Claims — but
    not yet framed or navigated as "Salary"]`
11. **Withdraw**: once a wallet crosses its minimum/Level gate, user requests a payout;
    admin reviews and pays. `[Our existing rule]`
12. Loop from step 8 for as long as the package stays active; renew/upgrade before
    expiry to keep the daily earning and task quota alive.

---

## 2. Navigation structure

`[Genre-standard]` — the near-universal shape for this app category, mobile-first, is a
persistent bottom tab bar (mobile) or left sidebar (desktop admin), something like:

- **Home/Dashboard** — wallet summary + shortcuts
- **Work Room / Tasks** — today's earning + task ritual
- **Team** — referral tree, levels, invite tools
- **Wallet / Assets** — balances, deposit, withdraw, history
- **Account/Profile** — settings, notifications, support, logout

A top bar usually carries: logo, a notification bell, and sometimes a live "announcement"
ticker. Everything else (packages, salary/bonus rules, FAQ, support) hangs off Profile or
a "More" menu rather than getting its own top-level tab, to keep the primary nav to 4–5
items — this matters because primary daily actions (Work Room, Team, Wallet) should never
be more than one tap away.

## 3. Dashboard layout

`[Genre-standard, consistent with our current build]`
- Top: wallet balance cards (exactly the multi-wallet split your platform already has:
  deposit/current/package-earning/staff wallets).
  - Prompted here as: package status card (active/expired + days remaining), a
    same-page shortcut into Work Room, a same-page shortcut into Team/referral.
- Below: recent activity feed (last few transactions), and often a marketing banner
  slot (announcements) admins can push.
- Persistent, low-friction access to Deposit and Withdraw from the dashboard itself.

## 4. Wallet system

`[Our existing rule — this is more rigorous in our platform than typical]` Most apps in
this genre use a single flat balance and blur where money "came from." Your platform's
four-wallet separation (Deposit / Current Balance / Coca-Cola Earning / Staff Earning),
each with its own withdrawal rule and a full transaction ledger, is already a step above
the reference category's usual opacity — keep it exactly as-is.

## 5. Deposit flow

`[Our existing rule, already matches genre-standard]` Select amount or package → shown
payment account details → submit reference ID + screenshot → pending → admin
approve/reject → notification. Already built, including the payment-details display
added in Milestone 18.

## 6. Package purchase flow

`[Our existing rule]` Same mechanics as a generic deposit, but locked to a specific
package's price and, on approval, activates the package (never tops up a spendable
balance) and starts the referral/daily-earning chain. Already built.

## 7. Daily earning workflow

`[Our existing rule, deliberately changed from the reference genre's norm]` The
reference genre almost universally makes this a **manual, once-a-day tap** ("claim,"
"check in," "collect") — partly a retention/engagement mechanic (drives daily app opens),
partly (per the scam reviews) a way to make "watching the balance grow" feel active and
game-like. Your platform explicitly chose the opposite: fully automatic, silent,
calendar-day-gated crediting with no button (Milestone 18, confirmed deliberate). This is
worth remembering tomorrow — a "Work Room" screen should NOT reintroduce a manual claim
button for the package earning itself, since that would reverse an approved rule. It can
still *display* today's credited amount and a countdown to the next one.

## 8. "Work Room" behavior

`[Genre-standard, reconstructed — not directly confirmed for the reference site itself]`
In this app category, "Work Room" (or "Task Center"/"Earning Room") is typically the
single screen that turns the day's task quota into a guided ritual rather than a plain
list:
- Shows "X of Y tasks completed today" (Y = the package's daily task limit — you already
  have this exact number as `dailyTaskLimit`).
  - Each task is a numbered "slot"; tapping one opens its video, then a short
  confirmation step, then credits and advances to the next slot.
- A visible per-day progress bar/counter, resetting at the same boundary each day.
- Often shows the reward-per-task and today's task-earnings-so-far total.
- Locked/greyed out once the package's daily quota is reached, with a "come back
  tomorrow" state.

For your platform, the natural design is: **Work Room = a themed wrapper around the
existing Tasks flow**, scoped to *today's* quota and *this package's* task set, with the
already-automatic Coca-Cola daily earning shown as a passive status card alongside it
(no button) — combining "the two things I do every day" into one screen without
touching either underlying business rule.

## 9. Task workflow

`[Our existing rule]` Already built: admin-configured video URL, per-package daily
count limit, reward credited to Current Balance only. Work Room is a presentation layer
on top of this, not a new engine.

## 10. Referral system

`[Our existing rule]` Unique code/link, multi-level (your platform: 12 levels, the
reference genre typically shows 2–3 levels prominently in the UI even when more levels
exist in the backend payout table), automatic commission on a downline's approved
package purchase. Already built end-to-end.

## 11. Team pages

`[Genre-standard]` Usually: a summary (total team, active team, direct referrals) plus a
per-level breakdown, and a searchable/filterable list of team members with their name,
join date, package, and status (active/expired). You already have the data
(`teamMembers`, per-level counts) — the gap is a dedicated, well-organized page rather
than scattered widgets.

## 12. Level progression

`[Our existing rule, defined but not yet a first-class feature]` Milestone 17 fixed the
definition: **Level N = N direct active referrals**, currently used only as the gate for
Coca-Cola Earning withdrawals. The reference genre treats "Level" as a much more visible,
almost game-like progression system:
- A dedicated Level page: current Level, a progress bar toward the next Level ("3 of 5
  direct active referrals for Level 5"), and a table of what each Level unlocks.
- Levels commonly gate more than one thing at once: withdrawal eligibility (already
  yours), salary/bonus tier eligibility, and sometimes a small "Level-up" one-time
  reward.
- Should reuse `getDirectActiveReferralCount` (already built) — no new counting logic
  needed, just a page and, likely, a "next Level" projection.

## 13. Salary/Bonus process

`[Our existing rule, already substantially built as "Bonus Tiers"/"Bonus Claims"]` Your
platform's Milestone 12 bonus system — admin-defined tiers keyed off direct referrals /
total team / active team / required package, one-time or recurring, self-claimed then
admin-approved with a live re-check — **is** a salary/bonus system already. The reference
genre usually brands the *recurring* tier as "Salary" (implying a stable, repeating
income once you hold a Level) and the *one-time* tier as "Bonus" (a milestone reward),
and gives them separate pages/navigation even though the backend mechanism is identical.
The gap here looks like framing/navigation, not new engine work: confirm whether you
want "Salary" surfaced as its own nav item (recurring tiers only) distinct from "Bonuses"
(one-time tiers), and whether Salary tiers should read Level directly rather than raw
referral counts.

## 14. Withdraw flow

`[Our existing rule]` Already built per-wallet (Current Balance minimum, Coca-Cola
Earning Level-gated), admin approve/reject with note + notification. No gap.

## 15. Notifications

`[Our existing rule]` Admin broadcasts + system-generated transactional notifications
(deposit/withdrawal/task/adjustment) already built (Milestones 16 & 18). Genre-standard
apps rarely go this far — this is already ahead of the reference category.

## 16. History pages

`[Our existing rule]` Per-user recent transactions + full admin Financial History ledger
already built (Milestone 19). Ahead of the reference category, which usually only shows
a flat, unfiltered "history" list with no admin-side ledger at all.

## 17. User experience observations

`[Genre-standard]` What tends to make these apps feel "sticky" (independent of the
business-model concerns above):
- A daily ritual that takes under two minutes (Work Room) so it fits into a habit slot.
- Everything important reachable in one tap from the dashboard (balances, Work Room,
  Team, Withdraw).
- Visible, real-time progress toward the *next* thing (next task slot, next Level, next
  Salary tier) rather than just current totals — progress bars over static numbers.
- Heavy use of push/in-app notifications for anything that changes a balance.

## 18. Admin requirements that can be inferred

`[Genre-standard, cross-checked against what you've already built]` Everything this
category needs on the admin side, you already have: package/task CRUD, deposit/withdrawal
review with proof preview, referral commission rate config, bonus tier config, withdrawal
rule config, full financial ledger, activity audit log. The one plausible addition
implied by "Level" and "Salary" becoming first-class features: an admin view of the
Level distribution across all users (e.g. "12 users at Level 5+") for marketing/ops
visibility — not required, but a natural companion to the dashboard statistics you built
in Milestone 19.

---

## 19. Comparison — what this means for our platform

### 19.1 Features we already have
- Registration, email verification, referral code capture
- Four-wallet split (Deposit / Current Balance / Coca-Cola Earning / Staff Earning)
- Deposit flow with payment details, reference ID, proof screenshot, admin review
- Package purchase flow (separate from plain top-up)
- Automatic daily package earning (calendar-day gated, no manual claim)
- Task system with per-package daily quota, admin-configured video links
- 12-level referral commission engine, automatic on package approval
- Level *definition* (direct active referrals) enforced for withdrawal gating
- Bonus system (tiers, one-time/recurring, self-claim + admin approval + live re-check)
- Withdraw flow, per-wallet rules, admin approve/reject with note
- Notifications: admin broadcasts + transactional (deposit/withdrawal/task/adjustment)
- Personal transaction history + full admin Financial History ledger
- Admin dashboard statistics (users, packages, pending queues, platform balance summary)
- Complete audit trail (activity log + financial ledger) for every money-moving action

### 19.2 Features still missing
- **Work Room** as a first-class screen (today's task ritual + today's earning status
  unified, distinct from the generic Tasks list)
- **Level** as a first-class, navigable page (progress bar, what each Level unlocks) —
  today it's an invisible gating rule, not something a user can see progress toward
- **Salary** as a distinct concept/page from "Bonuses" (if you want that separation —
  see open question in §13)
- A cohesive **primary navigation** (bottom tab bar or persistent sidebar) tying
  Dashboard / Work Room / Team / Wallet / Profile together — today's nav reads as a flat
  list of unrelated pages
- A dedicated **Team page** consolidating summary + per-level breakdown + member list
  (data exists, presentation doesn't)
- Admin visibility into **Level distribution** across users

### 19.3 Features that should be improved
- Dashboard should surface "next Level"/"next Salary tier" progress, not just current
  totals — nothing today shows a user how close they are to their next milestone
- Task list and daily package-earning status live on separate pages/components today;
  Work Room should be the single daily-ritual home
- Referral/Team data is spread across a few widgets rather than one coherent page

### 19.4 UX improvements
- Introduce a persistent bottom nav (mobile) / sidebar (desktop) with 4–5 items max:
  Dashboard, Work Room, Team, Wallet, Profile
- Progress bars wherever a threshold gates something (task quota, Level, Salary tier)
- Keep the daily package earning passive/automatic exactly as approved — Work Room
  should visually integrate it as a status card, never a button
- Ensure every balance-changing event a user can trigger (task submit, withdraw request)
  gives immediate, specific feedback, not just a generic "submitted" toast

### 19.5 Recommended implementation order
1. **Level page** — purely additive UI over data you already compute
   (`getDirectActiveReferralCount`); lowest risk, no new business rules.
2. **Work Room** — UI-only wrapper unifying existing Tasks + existing automatic daily
   earning display; no new engine, just needs the "today's quota" framing.
3. **Team page** — consolidate existing `teamMembers`/per-level-count data into one
   coherent page.
4. **Salary vs. Bonus navigation split** — only after confirming with you whether this
   is a real product distinction or purely a labeling change to the existing Bonus Tiers.
5. **Primary navigation restructure** — do this last, once the new pages above exist, so
   the nav is built around the final information architecture rather than guessed early
   and reshuffled twice.
6. **Admin Level-distribution view** — low priority, nice-to-have alongside the existing
   dashboard statistics.

---

*No FantaEarn/Fanta code, markup, copy, logos, or other protected assets were accessed,
copied, or reproduced in the making of this document. All recommendations target our own
existing Coca-Cola-branded architecture, data model, and previously approved business
rules.*
