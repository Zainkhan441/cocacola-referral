# Project State — CocaColaEarn

Last updated: 2026-07-28 (Global task-reward system, daily task rotation, all-or-nothing daily reward, package restructure, rebrand to CocaColaEarn)

This file is the single source of truth for "what's done, what's left."
Read this before starting any new work session on this repo.

## Stack / architecture

- Next.js 16.2.10 (App Router, Turbopack) — **note:** this version has
  breaking changes vs. training-data Next.js; read
  `node_modules/next/dist/docs/` before writing Route Handler code.
- Firebase: client SDK (`firebase`) for all UI code, `firebase-admin` for
  the one server-only surface (Admin User Management's permanent delete).
- Firestore named database **"default"** (not the reserved `(default)`) —
  both `src/lib/firebase/client.ts` and `src/lib/firebase/admin.ts` pass
  `"default"` explicitly. Never omit this.
- No commits/pushes/deploys happen automatically — every deploy this
  project has ever had was done after explicitly asking the user first.

## Completed features

### Core platform (pre-existing, stable)
Auth (email/password), referral-code signup attribution, packages catalog
+ admin CRUD (create/edit/enable-disable/permanent-delete with safety
checks), deposits/withdrawals with admin review, daily Coca-Cola earning
engine, tasks + submissions, bonus tiers/claims, CMS-managed marketing
pages, notifications, admin activity log.

### Direct Referral / Staff Earning / Current Balance system
- Referral commission is credited into **Current Balance** (real,
  withdrawable money) on admin approval of a package-purchase deposit —
  never into a separate "Staff Earning wallet" (that field is now
  reporting-only, frozen, computed live from `referralRewards`).
- Idempotency: `deposit.status` gate + explicit `referralRewards/{depositId}`
  existence check inside the transaction + rules-enforced immutability of
  that doc (create-only, id = depositId).
- `teamMembers/{ancestorUid}_{memberUid}` extended with `memberEmail`,
  `packagePrice`, `packageApprovedAt`, `commissionEarned` (level-1 only).
- Level system = count of direct active referrals (unchanged, pre-existing,
  verified correct).
- Files: `src/features/admin/lib/deposit-actions.ts` (`approveDeposit`),
  `src/lib/firestore/team-members.ts`, `src/lib/firestore/referral-rewards.ts`,
  `src/features/team/*`, `src/features/dashboard/components/{wallet-summary,referral-panel,recent-referral-activity}.tsx`.

### Admin User Management — **fully implemented and QA-passed**
- **View User**: `/admin/users/[uid]` (pre-existing, unchanged).
- **Suspend / Unsuspend / Archive / Restore**: `AccountStatus` =
  `active | suspended | archived | banned`. Suspend = temporary hold;
  Archive = long-term soft-remove, hidden from the default admin users list
  (status filter dropdown to reach it). Both fully reversible, no data
  loss. UI: `src/features/admin/components/user-status-actions.tsx`.
  Action: `setAccountStatusAction` in `src/features/admin/lib/user-actions.ts`
  (also sends the user a notification, atomically).
- **Enforcement is real, not just hidden buttons**: `firestore.rules`
  `isActiveAccount(uid)` blocks a non-active account from creating
  deposits, withdrawals, task submissions, bonus claims, or claiming daily
  earnings. Client-side: `useAccountStatusGuard` hook redirects a blocked
  user to `/account-status` — applied via `useAppAccessGate` (all full-app
  pages) **and directly on `/packages`** (the one page exempt from the
  package-lock gate, so it needs its own explicit check).
- **Permanent Delete**: `DELETE /api/admin/users/[uid]` (`src/app/api/admin/users/[uid]/route.ts`).
  Verifies the caller via a real Firebase ID token + re-checks `role: admin`
  server-side (`src/lib/auth/verify-admin-request.ts`) — never trusts the
  client. Blocks with 409 if a pending deposit/withdrawal/taskSubmission/
  bonusClaim exists for that user. Blocks self-delete (400). Deletes:
  Firebase Auth account, `users/{uid}`, `wallets/{uid}`,
  `referralCodes/{theirCode}` (prevents orphaned referral attribution),
  `userNotifications` for that uid. **Preserves**: transactions, deposits,
  withdrawals, packagePurchases, referralRewards, teamMembers — all already
  denormalized with name/email snapshots, so they stay meaningful with no
  live user doc. Writes one `activityLogs` entry. Idempotent: a
  second/third delete call on an already-deleted uid returns 404, no
  duplicate audit log entries, no crash.
- Admin SDK: `src/lib/firebase/admin.ts` (lazy singleton, targets the
  `"default"` database same as the client SDK). **Configured and verified
  working** — service account credentials are in `.env.local`
  (`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
  `FIREBASE_ADMIN_PRIVATE_KEY_BASE64`).
- Mobile-first UI throughout (confirmation modals, status badges, filter
  dropdown all follow the same responsive patterns as the rest of the app).

## Firestore schema/rules/indexes changed this milestone

- `AccountStatus` type: added `"archived"`.
- New rule helper `isActiveAccount(uid)`.
- Gated on `isActiveAccount`: `deposits` create, `withdrawals` create,
  `bonusClaims` create, `canClaimDaily()` (covers daily-claim self-service
  paths), `taskEligible()` (covers task submissions).
- `adminCanUpdateUser()`: `accountStatus` enum extended to include
  `"archived"`. **Critical fix**: added `lastDailyClaimAt` to the allowed
  field list (see Known Issues Fixed below) — was missing entirely.
- `referralRewards` create rule: `isAdmin()` checked before
  `resource.data.earnerUid` in the read rule's `||` (short-circuit avoids
  a null-dereference crash when reading a non-existent doc by id).
- New composite indexes: `deposits/withdrawals/taskSubmissions/bonusClaims`
  each get a `(uid asc, status asc)` index (used by the delete route's
  pending-item safety checks).
- `userNotifications`: new `NotificationKind` value `"account_status"`.
- **All of the above rules/indexes are deployed to the live `coca-rewards`
  Firestore project** (approved by the user, each time, before deploying).

## Known issues found and fixed this milestone (both were pre-existing bugs, not regressions from new work)

1. **`/packages` page didn't check `accountStatus` at all** — a suspended/
   archived user landing there (it's the one page exempt from the
   package-lock gate) was not blocked. Fixed with the new
   `useAccountStatusGuard` hook, applied directly in
   `src/app/packages/page.tsx`. Verified live.
2. **CRITICAL: every admin approval of a package-purchase deposit was
   silently failing** with Firestore permission-denied. `approveDeposit`
   writes `lastDailyClaimAt` on the user doc when activating a package,
   but `adminCanUpdateUser()`'s field allowlist never included that field
   — so the whole transaction was rejected, every time, for every package
   purchase, since the day that field was introduced. This was never
   caught before because this exact path (a real admin session approving
   a real package-purchase deposit against live rules) had never actually
   been exercised end-to-end until this QA session. Fixed by adding
   `lastDailyClaimAt` to the allowlist. **Deployed and verified live** —
   a full approval (package activation + referral commission credit +
   history records) now succeeds correctly.

## QA performed this milestone (all via disposable throwaway accounts, real UI + real Admin SDK, all cleaned up afterward)

1. Suspend → user blocked (redirected to `/account-status`, correct
   message) → Unsuspend → access restored. **PASS.**
2. Archive → hidden from default admin users list, visible under
   "Archived" filter, user blocked with correct message → Restore →
   data (balance) intact, user regains access, reappears in default list.
   **PASS.**
3. Seeded a real package purchase (real deposit + real admin approval,
   which is what surfaced bug #2 above) generating real transactions,
   packagePurchases, referralRewards, and teamMembers commission records.
4. Permanent delete: Firebase Auth removed, `users`/`wallets`/
   `referralCodes`/`userNotifications` removed; transactions, deposits,
   packagePurchases, referralRewards, teamMembers all preserved with
   correct data; the referrer's Current Balance (220, from the referral
   commission) unaffected; one audit log entry written. **PASS, every
   sub-check.**
5. Delete blocked by a pending deposit (409, correct message, account left
   fully intact). **PASS.**
6. Admin self-delete blocked (400, correct message). **PASS.**
7. Duplicate/retry delete on an already-deleted account: safe 404 both
   times, no duplicate audit log entries. **PASS.**

Lint, `tsc --noEmit`, and production build all pass on the current tree.

## Housekeeping performed 2026-07-27

### 1. Legacy disposable account cleanup — DONE
Scanned every Firebase Auth user (59 total at the start of this pass).
Identified 49 as disposable by unambiguous criteria (email on the
IANA-reserved `@example.com` domain, or the real owner's own address with
Gmail `+qatest` tagging) plus 4 more orphaned Firestore-only docs (no Auth
account at all) from an even earlier session, predating the referral-system
QA. All 53 were deleted: Firebase Auth account (where one existed),
`users/{uid}`, `wallets/{uid}`, `referralCodes/{theirCode}`,
`userNotifications`. Cross-collection orphan sweep also removed financial/
referral records that referenced *only* disposable accounts: 1
`transactions` doc, 4 `deposits` docs, 5 `teamMembers` docs. Zero
`withdrawals`/`taskSubmissions`/`bonusClaims`/`packagePurchases`/
`referralRewards`/`activityLogs` were affected (none existed for
disposable accounts). **10 real users remain, verified byte-for-byte
unchanged** — including the real admin account (`qaidino404@gmail.com`)
and a real user with an actual Rs 300 balance (`mirsaab55mirr@gmail.com`).
Full before/after account list is in the chat transcript for this session.

### 2. `staffEarning` legacy-balance migration — REVIEWED, NO MIGRATION NEEDED
Audited every real user's `users.staffEarning` and `wallets.staffEarning`
field directly via the Admin SDK: **all zero, no exceptions.** Also
confirmed zero `referralRewards` documents exist yet (no referral
commission has ever actually been earned by a real user in this project),
and zero `transactions` with `wallet == "staffEarning"` (no historical
manual adjustment ever targeted it either). Conclusion: there is no
legacy `staffEarning` balance anywhere in this project's real data — the
migration question raised in the earlier referral-system report turned
out to be moot once actually checked. **No migration is required, and
none was run.** If this ever needs re-checking after real users start
earning referral commissions, the same live query is trivial to re-run.

## Withdrawal System Production QA — 2026-07-27 — **COMPLETE, production-ready**

Full audit of every withdrawal flow: `src/lib/firestore/withdrawals.ts`,
`src/features/wallet/lib/actions.ts` (`submitWithdrawalRequest`),
`src/features/wallet/lib/validation.ts`, `src/features/admin/lib/withdrawal-actions.ts`
(`approveWithdrawal`/`rejectWithdrawal`), `src/features/admin/lib/withdrawal-rules-validation.ts`,
`src/features/dashboard/components/withdrawal-form.tsx`,
`src/features/wallet/hooks/use-withdrawal-eligibility.ts`, and the
`firestore.rules` withdrawal/transaction sections. Tested live end-to-end
via disposable QA accounts (Firebase Auth + Firestore, real UI + direct
Admin SDK bypass attempts), all deleted afterward — zero QA residue
remains in any real collection.

### Bugs found and fixed

1. **Withdrawal rules form: empty field silently saved as 0.** An admin
   clearing "Current Balance minimum withdraw" or "Coca-Cola Earning
   required Level" to an empty string and saving persisted `0` —
   instantly and invisibly waiving that withdrawal restriction
   platform-wide, with no error shown. Root cause:
   `withdrawal-rules-validation.ts` validated the already-converted
   `Number(...)` value, and `Number("")` is `0` (a legal, non-NaN number),
   so the empty-string case was never rejected. Fixed by rewriting
   validation to operate on the raw string first (`parseNumericInput`
   returns `null` for empty/non-numeric input, rejected with a clear
   error) — `Number()` conversion now only happens after validation
   passes, in `withdrawal-rules-form.tsx`. **Verified live**: clearing
   the field and saving now shows "Required Level must be a valid
   number." and the setting is left unchanged.
2. **Admin wallet-adjustment transactions always displayed as green "+"
   regardless of direction.** A manual balance *decrease* via
   `adjustUserWalletAction` showed a misleading green "+Rs X" everywhere
   a transaction ledger is rendered, because `direction` was inferred
   purely from `type`, and `admin_adjustment` always fell into the "in"
   bucket. Also found a related inconsistency: `package_purchase` was
   treated as "out" in 2 of 4 display components and "in" in the other 2.
   Fixed by adding an optional `direction: "in" | "out"` field to
   `TransactionDoc`, set explicitly by `adjustUserWalletAction` based on
   the actual sign of the adjustment, plus one new shared helper
   `src/lib/transaction-direction.ts` (`transactionDirectionFor`)
   consolidating all 4 previously-duplicated, inconsistent
   implementations (`transaction-history.tsx`, `admin/transactions/page.tsx`,
   `recent-transactions.tsx`, `user-detail-client.tsx` — all now import
   the shared helper instead of their own local logic), standardizing
   `package_purchase` as "out" everywhere. **Verified live**: a new
   admin-adjustment decrease correctly shows "-Rs 50" in red. Pre-fix
   historical decrease records still display their original (incorrect)
   "+Rs X" — intentional, no retroactive data rewrite performed; this is
   a display-only field with no financial/balance impact.

### Firestore rules change made — **DEPLOYED 2026-07-27, approved by the user**

Added a value constraint to the admin branch of the `transactions/{id}`
create rule: `direction`, if present, must be `"in"` or `"out"`
(`&& (!("direction" in request.resource.data) || request.resource.data.direction in ["in", "out"])`).
Closes the gap where the new `direction` field (added for bug #2 above)
had no rules-side validation at all. `firebase deploy --only
firestore:rules --dry-run` compiled cleanly, then the real deploy was run
(`NODE_OPTIONS="--use-system-ca" firebase deploy --only firestore:rules`)
against the live `coca-rewards` project — CLI confirmed
`+ firestore: released rules firestore.rules to cloud.firestore` /
`+ Deploy complete!`, no errors. Additive/non-breaking change; everything
else this milestone was already verified against the (now-superseded)
previously-live rules.

### QA scenarios executed, all PASS

Current Balance withdrawal (min-amount rejection, balance-exceeded
rejection, happy path) · Coca-Cola Earning withdrawal (Level-gating
blocked below threshold, unblocked at/above threshold, and the
authoritative server-side re-check at approval time correctly rejecting
an approval if the Level requirement is no longer met even though it was
met at submission) · pending-request-per-wallet protection (a second
withdrawal from the same wallet blocked client-side and rules-side while
one is pending) · duplicate-submission / race-condition safety (concurrent
`Promise.all` submissions against the same wallet — exactly one
transaction wins) · admin approval (balance debited, transaction
recorded, notification sent) · admin rejection (balance untouched,
pending marker cleared, notification sent, optional note handled) ·
transaction history (including the now-fixed direction display) ·
Firestore rules enforcement via 6 direct bypass attempts (uid spoofing,
self-approval, direct balance write, suspended-account block, invalid
account number, below-minimum amount) — all correctly rejected ·
mobile UI at 375×812 (no horizontal overflow, screenshots reviewed) ·
error handling / edge cases (non-numeric amount, negative amount,
invalid account number, suspended account, exhausted retry attempts).

### Findings flagged, deliberately NOT fixed (outside withdrawal-QA scope)

1. **Real "Basic" package (`szu6T9AAIPFnBKjDFiFY`) has orphaned schema
   fields** — `durationDays: 10`, `withdrawalLimitPerRequest: 500`,
   `dailyWithdrawalLimit: 10` — none of which exist in the current
   `PackageDoc` schema or are read by any current code, and
   `durationDays` directly contradicts the established "packages never
   expire" rule. Almost certainly leftover from a stray QA script in an
   earlier session writing directly to real package data. Not touched —
   flagged here for a deliberate cleanup decision later.
2. **Packageless-user Locked-Mode withdrawal lockout edge case** — a user
   who earned Current Balance purely via referral commission (which
   doesn't require the referrer to hold a package) can have their package
   later removed by an admin via "Change package," which then locks them
   out of `/wallet` entirely via `useAppAccessGate`'s package-null
   redirect — making already-earned, real Current Balance permanently
   unwithdrawable through the UI. This is existing Locked-Mode business
   logic, not a withdrawal-system bug per se; fixing it would mean
   changing Locked Mode's rules, which was not requested and is outside
   this milestone's scope.
3. **`WithdrawalStatus` includes `"paid"`** (`src/lib/firestore/withdrawals.ts`)
   which is declared but never set or read anywhere in the app — dead
   enum value, harmless, not removed since it wasn't causing any issue.
4. `settings/withdrawalRules.cocaColaRequiredLevel` is currently live at
   `11` (not the code default of `10`) — this is a real admin-configured
   value from earlier testing, not a bug; confirmed unchanged and intact
   after this milestone's QA.

### Cleanup performed

All disposable QA data deleted via direct Admin SDK scripts, then
verified at zero via a second inventory pass: 2 Firebase Auth accounts +
their `users`/`wallets`/`referralCodes` docs, 1 disposable test package,
11 fake `teamMembers` seed docs, 4 `withdrawals` docs, 6 `transactions`
docs, 7 `userNotifications` docs, 4 `activityLogs` entries. Zero real
user data touched. All temporary scripts removed from the project root.

Lint, `tsc --noEmit`, and `next build` all pass clean on the current tree.

## Full-application production audit + fixes — 2026-07-27 — **COMPLETE**

A ranked audit was performed across every module (Auth, Dashboard,
Packages, Deposits, Withdrawals, Referral, Tasks, Notifications, Wallets,
Admin Panel, Firestore Rules, Security, Mobile, Performance). Full
`firestore.rules` read end-to-end (100%). Two High-severity findings were
identified and fixed; no Critical findings existed. See the conversation
transcript for the complete ranked findings list (Medium/Low items are
documentation drift, dead/orphaned fields, and one performance note on
`<img>` vs `next/image` for CMS media — none blocking, none fixed this
round per explicit scope).

### High #1 — Recurring bonus-claim duplicate-payout gap — **FIXED**

`submitBonusClaim` previously checked for an existing pending claim via a
plain, non-transactional query, and the `bonusClaims` create rule had no
guard against a second pending claim for the same `(uid, tierId)` —
unlike withdrawals, which already had an atomic per-wallet marker.
Fixed with the same pattern, adapted for a dynamic tier id:

- New collection `pendingBonusClaims/{uid}_{tierId}` — a one-doc-per-tier
  lock, deterministic id (same "id proves exclusivity" trick as
  `bonusAwards`), created in the same client transaction as the new
  `bonusClaims` doc (`src/features/bonuses/lib/actions.ts`), deleted in
  the same transaction that resolves it (`approveBonusClaim`/
  `rejectBonusClaim` in `src/features/admin/lib/bonus-actions.ts`).
- `firestore.rules`: new `pendingBonusClaims/{id}` match block, plus
  `!exists(pendingBonusClaims/{uid}_{tierId})` added to the `bonusClaims`
  create rule (defense-in-depth against a raw-SDK bypass that skips the
  app's transaction entirely).
- `src/lib/firestore/bonus-claims.ts`: new `pendingBonusClaimDocRef()` helper.
- **Bug found and fixed during QA, before deploy**: the first version of
  the `pendingBonusClaims` read rule (`resource.data.uid == request.auth.uid
  || isAdmin()`) crashed with a null-dereference on every first-ever claim
  for a tier (checking a lock that doesn't exist yet) — same class of bug
  as an earlier `referralRewards` fix. Corrected to
  `resource == null || resource.data.uid == request.auth.uid || isAdmin()`
  before deploying.
- **Deployed** to the live `coca-rewards` project (two rules deploys:
  the initial version, then the read-rule correction — both explicitly
  approved beforehand).
- **QA, all via disposable throwaway accounts + a zero-threshold
  disposable bonus tier, all deleted afterward**: 10 concurrent
  submission attempts → exactly 1 won, 9 correctly rejected; a direct
  raw-SDK bypass attempt (skipping the app's lock-creation entirely) →
  rejected by rules alone; a non-admin attempting to delete their own
  lock → rejected; real admin-UI approval → credited exactly once
  (verified in `users` and `wallets`), lock cleared, claim marked
  approved; real admin-UI rejection → balance untouched, lock cleared,
  claim marked rejected; **a legitimate new claim for the same tier
  succeeded both after an approval and after a rejection** (recurring
  claims are not permanently blocked). All PASS.

### High #2 — Official Channel URL scheme validation — **FIXED**

Telegram/WhatsApp/YouTube/Website/banner-image URLs on the admin Official
Channel form had no scheme validation (unlike every CMS URL field, which
already used `validateSafeUrl`/`validateOptionalSafeUrl`), so a
`javascript:`/`data:` URL could be stored and would execute when any
signed-in user clicked the resulting link on `/channel`. Fixed by adding
`validateOptionalSafeUrl` checks in both
`src/features/admin/components/official-channel-form.tsx` (client, for
immediate inline errors) and `src/features/admin/lib/channel-actions.ts`
(action-layer, defense-in-depth regardless of caller) — no
`firestore.rules` change was needed or made for this fix. **QA (against
the real, live `settings/officialChannel` doc — captured and restored
byte-for-byte after every test)**: `javascript:`/`data:`/malformed URLs
all correctly rejected with a clear error, both fields tested; valid
`http://` and `https://` URLs correctly accepted and persisted; the
rendered `<a href>` on `/channel` matches exactly (`target="_blank"`,
`rel="noopener noreferrer"`). All PASS.

**Incidental finding, NOT fixed (pre-existing, unrelated to this fix,
outside approved scope)**: `setOfficialChannel` does a full `setDoc`
(not merge), so saving the Official Channel form from the admin UI
silently drops any field not in `OfficialChannelInput` — in particular
two legacy fields (`easypaisaAccountName`, `easypaisaAccountNumber`)
still present on the live `settings/officialChannel` document from
before payment details were split into their own `settings/paymentDetails`
doc. Confirmed nothing in the app reads these two fields anymore, so this
is a data-hygiene issue, not a functional bug — flagged for a future
decision, not fixed here.

### Full account reset — 2026-07-27 — **COMPLETE, explicitly requested**

Per explicit instruction, every Firebase Authentication account was
deleted **except `qaidino404@gmail.com`** (uid
`gm5oOnW5nAaOi6Dd3T8V8P8UE293`) — 9 accounts removed, including real
(non-QA) user accounts that predate this session. All user-specific
Firestore data for every removed account was removed alongside it:
`users`, `wallets`, `referralCodes` (including previously-orphaned codes
with no matching user — a pre-existing cleanup gap from before this
session), `transactions`, `userNotifications`. `activityLogs` was swept
too (defensive — every existing entry was already authored by the kept
admin, so nothing was actually removed there). **Explicitly untouched**:
`settings` (`global`/`withdrawalRules`/`officialChannel`/`paymentDetails`),
`packages`, `referralLevelSettings`, all `cms*` collections — verified
by exact document-count match before and after. A full metadata snapshot
(every deleted Auth account's uid/email, every deleted user/wallet/
referralCode/transaction/notification document's full contents) was
written to a local scratch file before deletion, for audit/recovery
reference — this is a record only, not a live restore mechanism.
**Verified after**: exactly 1 Auth user remains (`qaidino404@gmail.com`,
not disabled, password provider intact); exactly 1 `users` doc
(`role: "admin"`, `accountStatus: "active"`); exactly 1 `wallets` doc;
exactly 1 `referralCodes` doc (matching this account); 0 transactions;
0 userNotifications; all 30 `activityLogs` entries still present and
still authored by this same account; every shared/global collection's
document count matches its pre-wipe count exactly.

Lint, `tsc --noEmit`, and `next build` all pass clean on the current tree.

### Global task reward, daily task rotation, all-or-nothing daily reward, package restructure, rebrand — 2026-07-28 — **COMPLETE, QA-passed (48/48)**

Replaces the old per-task admin-reviewed-proof reward system and the old
automatic-only daily package earning with a single, bundled, fully
automatic daily loop. **Rebrand**: product name changed from "Coca
Rewards" to **CocaColaEarn** everywhere (single source of truth:
`src/config/site.ts`'s `name` field) — no other branding/theme/color
changed, no database/API/route/business-logic rename.

**1. Global task reward** — `settings/taskRewards` (singleton doc,
`rewardPerAd: number`, default Rs 5 when absent) replaces per-task reward
amounts entirely. Read live at claim time (never copied onto a task/user
doc), so an admin change takes effect immediately for every existing and
future task. Admin UI: "Task Reward Settings" card above the task list on
`/admin/tasks`.

**2. Task schema trimmed** — `TaskDoc`/`TaskInput` dropped `rewardAmount`,
`frequency`, `proofRequired`. Kept: title, description, instructions,
videoUrl (any http/https URL, no host whitelist), requiredPackageId/
minPackagePrice, startDate/endDate, status. Admin form's Instructions
field defaults to "Watch the advertisement till the end to earn today's
reward." (editable).

**3. Daily task rotation** (`taskRotations/{uid}`, one per user, NOT part
of the financial trust boundary — light shape validation only, no money
logic anywhere reads it) — admin creates any number of active tasks;
each user is offered `dailyTaskLimit` random tasks per day from their
eligible-active pool, never repeating a task until every eligible task
has been completed at least once (then reshuffles, a fresh cycle,
repeats allowed again). Pure algorithm: `src/features/tasks/lib/rotation.ts`
(`computeTodaysAssignment`, unit-testable, no Firestore access).

**4. Video-watch completion** (`taskCompletions/{uid}_{taskId}`, two-phase
Start→Complete, reused across days) — YouTube URLs use the real IFrame
API `ENDED` event; any other URL falls back to a 10-second,
tab-visibility-aware timer. The actual, unconditional floor is
rules-enforced: `request.time >= startedAt + 10s`, regardless of what the
client claims. `dailyTaskProgress/{uid}` (one per user) counts distinct
completions per real UTC calendar day, incremented in the same
transaction as each Complete — this is the only thing the reward claim
actually reads (not per-task documents), keeping every write's rule
evaluation cheap.

**5. All-or-nothing bundled claim** (`claimDailyTaskReward` in
`src/features/tasks/lib/actions.ts`) — package earning is **never**
credited alone anymore; both the flat task reward
(`dailyTaskLimit × rewardPerAd`) and the package's daily earning are
credited together, once, only once `dailyTaskProgress.count >=
dailyTaskLimit` for the current UTC day, reusing the exact
`lastDailyClaimAt`/`isNewUtcDay` idempotency the old automatic system
already relied on. `dailyRewards` (unchanged shape) is still written
for backward-compat with the admin "Today's Earnings Paid" stat; two
`transactions` docs are written per claim (`type: "task_reward"`,
`type: "daily_reward"`).

**6. Referral commission** — audited, confirmed unchanged and already
strictly one-level/direct-only (see the existing "Direct Referral / Staff
Earning" section above). No code changes were needed; QA re-confirmed the
Ali→Zain→Salman scenario (Ali earns only from Zain, nothing from Salman)
against live rules.

**7. Four production packages** — `packages` collection was empty at the
start of this milestone; created exactly:
| Name | Price | Daily tasks | Daily earning | Referral commission |
|---|---|---|---|---|
| Coca Basic | 1000 | 1 | 350 | 220 |
| Coca Standard | 2000 | 2 | 600 | 400 |
| Coca Premium | 4000 | 4 | 1350 | 750 |
| Coca Super Premium | 7000 | 8 | 2400 | 1700 |

`allPackagesQuery` now orders by `price asc` (always Basic→Super Premium
regardless of creation order). `/packages` page changed from a 3-column
grid to a centered vertical stack (`package-card.tsx` capped at
`max-w-md`) — no Fanta branding/assets/copy referenced, only the layout
shape matched; existing Coca-Cola color theme untouched.

**New Firestore collections**: `taskCompletions`, `dailyTaskProgress`,
`taskRotations`, plus the `settings/taskRewards` singleton doc. **No new
indexes required** — every new read is a single-document `get()`, never a
paginated query.

**Old collections/code left untouched, not deleted** (per "do not delete
working data"): `taskSubmissions`, `taskCooldowns`, `taskDailyCounters` —
frozen, no new writes ever land here again; the admin Task Submissions
review page remains as a historical view. `runAutomaticDailyEarning`
(`src/features/earnings/lib/actions.ts`) and its retired rules branch are
dead code, never called from any UI anymore.

**Deleted (fully orphaned, zero remaining importers)**: `task-card.tsx`,
`task-submission-form.tsx`, `task-submission-history.tsx`,
`daily-claim-card.tsx`.

#### Three real bugs found and fixed during live QA (all now deployed)

QA was run against the live `coca-rewards` project using disposable
accounts (a real Ali→Zain→Salman referral/registration/purchase/task/claim
flow through the actual client SDK and production rules — not mocked),
plus direct rules-bypass attempts. Three genuine bugs surfaced and were
fixed and redeployed before QA could pass:

1. **Rotation never actually shrank** — `computeTodaysAssignment` had no
   mechanism to move a genuinely-completed task from `remainingPoolTaskIds`
   into `completedThisCycleTaskIds`, so the "no repeat until the whole pool
   is exhausted" guarantee was silently broken (a task could be redrawn
   the very next day). Fixed: `computeTodaysAssignment` now accepts
   `completedSinceLastAssignment` (resolved by `use-daily-tasks.ts` from the
   real `taskCompletions` records of the previous assignment) and folds
   those into the pool exactly once, at the moment a new day's assignment
   is computed.
2. **`taskCompletions`'s read rule threw on every very first Start** —
   `allow read: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin())`
   dereferences `resource.data` unconditionally; for a task a user has
   never started, `resource` is `null`, which throws (denied) — the exact
   same pitfall `pendingBonusClaims` already documents elsewhere in this
   file. This blocked literally every user's first-ever task Start in
   production until fixed with `resource == null || ...`.
3. **Write-order-dependent rule staleness in the bundled claim** — within
   a single `runTransaction`, a rule's `get()` call for one write reflects
   an **earlier write already issued to that same document in the same
   transaction**. `claimDailyTaskReward` issued the `users/{uid}` update
   (which sets `lastDailyClaimAt` to "now") before the `wallets/{uid}`
   update, `dailyRewards` create, and the two `transactions` creates — all
   four of which independently re-derive `canClaimDaily`/eligibility via a
   fresh `userData(uid)` read, since none of those documents carry their
   own `lastDailyClaimAt`. Each of those fresh reads then saw the just-set
   "now" and its own `isNewUtcDay` check compared "now" against "now" —
   always false, permission-denied, on every single legitimate claim.
   Fixed two ways: (a) reordered `claimDailyTaskReward` so `users/{uid}` is
   written **last**, after every sibling that needs a fresh read of it; (b)
   added a missing `task_reward` branch to `transactions`'s self-service
   create rule (it previously only ever permitted `type == "daily_reward"`
   for a non-admin author, so the new bundled claim's `task_reward` ledger
   entry could never have been written at all, by any user, regardless of
   ordering). Also simplified `dailyTaskQuotaMet` into a single-fetch
   `dailyTaskQuotaMetFromDoc(progress, requiredCount)` taking an
   already-read `dailyTaskProgress` doc, reducing redundant `get()` calls
   per write.

All three fixes are live in the deployed `firestore.rules` /
`src/features/tasks/lib/actions.ts` / `src/features/tasks/lib/rotation.ts`
/ `src/features/tasks/hooks/use-daily-tasks.ts`.

#### QA results — 48/48 assertions passed

Covered (via real disposable accounts against live production rules, all
cleaned up afterward — zero QA data or accounts remain):
registration/login/referral-chain attribution; the four packages' exact
values; direct-only referral commission (Ali/Zain/Salman, one level,
no duplicate on re-approval attempt); `referredBy` immutability and
self-referral impossibility; admin-only global reward setting (default
Rs 5, then explicit change, applied immediately to a pre-existing task);
non-admin rejected from writing `settings/taskRewards`, inflating their
own balance, self-crediting a `referralRewards` doc, or creating a task;
package-sized task assignment (Standard→2, Basic→1) with disabled/
expired/future/wrong-package tasks never assigned; the 10-second
watch-floor enforced both client-side and by rules (direct hand-crafted
instant-complete and dailyTaskProgress count-jump both rejected);
duplicate completion of the same task same day blocked; 1/2 tasks →
Rs 0/Rs 0; 2/2 tasks → both credited exactly once, atomically; concurrent
repeat-claim attempts (double-click/two-tab race) → no double-credit;
reward-per-ad change applied immediately to a pre-existing task; a
newly-created task joining the rotation pool without disturbing an
already-offered assignment; the pool-fold-in (completed tasks leave the
pool, never repeat next day) and pool-exhaustion reshuffle behavior,
verified at the pure-function level since a real multi-UTC-day wait isn't
feasible in a single QA session.

A pre-deploy Firestore snapshot (Admin SDK JSON export of all 11 live
collections, 121 docs) was written to the local scratch directory before
any rules deployment, as a safety net — not needed in the end, since
every deploy in this milestone only ever changed Security Rules, never
touched a document.

Lint, `tsc --noEmit`, and `next build` all pass clean on the current tree
(re-verified after all three bug fixes above, not just before them).

#### Post-migration dead-code cleanup — 2026-07-28 — **COMPLETE**

A follow-up audit (prompted by an explicit "confirm no dead code" request)
found 6 files that the task-system rewrite above had silently orphaned —
zero remaining callers anywhere, confirmed by exhaustive grep before
deletion, and their backing collections were verified **empty in
production** (0 documents each) before touching anything:
`src/features/tasks/hooks/use-daily-task-quota.ts`,
`src/features/tasks/hooks/use-my-task-submissions.ts`,
`src/features/earnings/hooks/use-daily-claim-status.ts`,
`src/features/earnings/lib/actions.ts` (`runAutomaticDailyEarning` — the
old retired automatic-claim function; this was the file's only export, so
the whole file was removed), `src/lib/firestore/task-daily-counters.ts`,
`src/lib/firestore/task-cooldowns.ts`. All deleted.

`firestore.rules`: removed the now-fully-unreachable `taskDailyCounters/{uid}`
and `taskCooldowns/{id}` match blocks entirely (their only purpose was
gating `taskSubmissions` creates, and nothing can create a new
`taskSubmissions` doc anymore — the client file that used to do that,
`task-submission-form.tsx`, was removed in the milestone above). Also
removed the now-dead `taskDailyCounterAllowsSubmission()` helper function
(its only call site was the create rule just removed). `taskSubmissions/{id}`'s
`allow create` changed from a long, now-unreachable-and-partially-invalid
condition (it referenced `rewardAmount`/`frequency`/`proofRequired` fields
that no longer exist on any task) to a flat `if false` — read access and
the admin-review `allow update` (approve/reject) are both kept unchanged,
so the frozen admin Task Submissions page still works exactly as before
for any pre-migration history (there is none currently; collection is
empty).

`firestore.indexes.json`: removed the `taskSubmissions (uid asc, createdAt
desc)` composite index — it only ever existed for the now-deleted
`myTaskSubmissionsPageQuery`. Not deployed (no indexes deploy was
requested or needed since nothing currently depends on it); the source
file is just cleaned up for the next real indexes deploy whenever one
happens. A second, unrelated pre-existing `taskSubmissions (uid asc,
status asc)` index was left alone — it predates this session's work and
matches no current query either, but touching it is outside this
cleanup's scope.

Stale comments referencing the deleted files by name were also updated in
`src/lib/firestore/packages.ts`, `src/lib/firestore/daily-task-progress.ts`,
and `src/lib/firestore/task-submissions.ts` (the latter also lost 3 dead
exports — `oneTimeTaskSubmissionDocRef`, `newTaskSubmissionRef`,
`myTaskSubmissionsPageQuery` — that had zero remaining callers once their
sole caller, the deleted `use-my-task-submissions.ts` hook, was gone).

**Verified after cleanup**: exhaustive repo-wide grep for every deleted
file's old import path, every deleted export name, `taskDailyCounters`,
`taskCooldowns`, and the old automatic-daily-earning flow — zero
remaining references anywhere in `src/`. Clean install
(`rm -rf node_modules && npm install`) + `npm run build` both pass.
`firestore.rules` dry-run compiled clean, then deployed. A focused smoke
QA (task loading, task start, the 10s completion floor, dailyTaskProgress,
the bundled reward claim, duplicate-claim rejection, and admin
create/update/disable/re-enable task management) — 16/16 passed against
the live, cleaned-up rules. No user data, production documents, or
collections were touched — only unreachable rule branches and dead client
code were removed.

### Manual payment-screenshot cleanup system — 2026-07-28 — **COMPLETE, deployed, QA-passed (46/46)**

Production-safe cleanup for the existing Base64-in-Firestore payment
screenshot approach — **deliberately stays on Spark (free)**: no Firebase
Storage, no Blaze billing, no Cloud Functions, no TTL, no paid service of
any kind. Storage was confirmed never provisioned on this project before
starting (`bucket.exists()` → false; Cloud Billing API never enabled) —
this design keeps it that way.

**Compression** (`src/lib/storage/payment-screenshots.ts`): JPEG/PNG/WebP
only (SVG and everything else explicitly rejected); client-side canvas
compression targets ≤300KB stored size (quality steps 0.85→0.5); if still
over budget at the quality floor, the upload is **rejected** (asks for a
smaller/clearer image) rather than silently exceeding the limit or
degrading past readability.

**Schema** (`DepositDoc`): added `screenshotSizeBytes`, `screenshotStatus`
(`"available" | "deleted" | null`), `screenshotDeletedAt`,
`screenshotDeletedBy`, `screenshotDeletionReason` — all additive, no
existing field touched.

**Admin controls**: View/Download/Delete-Permanently buttons on every
deposit with a screenshot (`deposit-screenshot-controls.tsx`), shared
between the existing deposit-review row and a new dedicated
`/admin/screenshot-management` dashboard. Delete requires a two-step
modal (strong warning + a second explicit "Yes, Permanently Delete
Screenshot" button), with an ADDITIONAL warning when the deposit is still
`"pending"`. Download converts the data URL to a real Blob client-side
(`src/lib/download-data-url.ts`) with a meaningful filename
(`payment-proof-{depositId}-{date}.jpg`) and correct extension.

**Reminders**: a mild "Payment verified..." note appears immediately once
a deposit is approved/rejected; it escalates to a prominent warning once
24 hours have passed since the deposit's `updatedAt` (the exact instant
`approveDeposit`/`rejectDeposit` already stamp — no new field needed).

**Dashboard**: total screenshots, total storage used, average size,
largest screenshot, oldest screenshot, and an "awaiting cleanup" count
(approved/rejected deposits whose screenshot is still stored) — one
unpaginated fetch of every deposit that ever had a screenshot
(`depositsWithScreenshotHistoryQuery`), computed client-side; realistic
volume stays small precisely because this dashboard exists. Bulk
**selection** lets an admin reveal several screenshots at once for quick
review — deliberately **view-only**; there is no bulk-delete action
anywhere, confirmed both by code audit (grep for `bulk.*delete` etc. —
zero matches outside explanatory comments) and by `deleteDepositScreenshotAction`'s
single-`depositId` signature.

**Audit trail**: every deletion writes an `activityLogs` entry
(`action: "deposit.screenshot_deleted"`) containing the admin's UID, the
deposit ID, a server timestamp, and the exact byte size removed — the
image itself is never logged anywhere.

**Firestore rules**: `deposits/{id}` create validation extended to
require internally-consistent screenshot fields, a hard 450KB size
ceiling, and — found and fixed during this work, before QA — a **MIME
prefix regex check** (`^data:image/(jpeg|png|webp);base64,.*`) that the
first pass of these rules omitted entirely (only `is string` + size were
checked, meaning a hand-crafted request could originally smuggle in any
content type, e.g. `text/html`, under the size cap). New
`adminCanDeleteScreenshot()` function: admin-only, re-checks
`screenshotStatus == "available"` server-side (the real double-deletion
guard), touches only the 5 screenshot fields + `updatedAt`, stamps
`screenshotDeletedBy`/`screenshotDeletedAt` to non-forgeable exact values.

**QA — 46/46 passed**, live against production rules with disposable
accounts: valid JPEG/PNG/WebP acceptance with correct size tracking; SVG
and non-image data URLs rejected (post-fix); oversized (>450KB) rejected;
admin read access; owner blocked from replacing or deleting a submitted
screenshot; a hand-crafted create attempt with pre-set deletion-audit
fields rejected; the full deletion workflow (screenshot cleared, deposit
document and every financial/audit field — status, amount, referenceId,
reviewedBy, senderAccountNumber, wallet balances — unchanged); the
24-hour escalation arithmetic; the pending-deposit-warning condition;
activity log contents (admin UID, deposit ID, timestamp, size, never the
image); double-deletion rejected; dashboard stat formulas (total,
average, awaiting-cleanup count correctly excluding still-pending
deposits) verified against known fixture data. **Two-step modal
confirmation and bulk-selection UI interactions are code-reviewed but not
executable from this session's non-browser QA harness** — the
backend/rules-enforced parts of every one of those flows were verified
live. All QA data and disposable accounts cleaned up afterward — verified
0 deposits and exactly the 3 pre-existing real users/admin remain in
production.

Lint, `tsc --noEmit`, and `next build` all pass clean (43 routes).
`storage.rules`/`firebase.json` confirmed untouched (git diff empty) —
no Storage, no Blaze, no paid service enabled at any point.

## Remaining before production

1. **Nothing blocking is known to remain in the Withdrawal System** — it
   is QA-complete, including the rules deploy (now live).
2. **Nothing blocking is known to remain in Admin User Management** — it
   is QA-complete.
3. **Nothing Critical or High is known to remain anywhere in the
   application** — see the full-application audit above. The remaining
   Medium/Low items (see conversation transcript for the complete list)
   are all either cosmetic, dead-code cleanup, or narrow data-hygiene
   issues with no security or financial-integrity impact:
   - `setOfficialChannel`'s full-`setDoc` silently drops
     `easypaisaAccountName`/`easypaisaAccountNumber` (see above) — decide
     whether to remove these dead fields entirely or switch the save to a
     merge.
   - Admin dashboard's "Staff Earning" stat card is permanently Rs 0 and
     unlabeled as legacy (the user-detail page correctly labels the same
     field "(legacy field)").
   - `/notifications` skips the `MissingProfileRecovery` handling every
     sibling page has for an interrupted-signup user.
   - CMS hero/banner images use plain `<img>` instead of `next/image`
     (deliberate — no domain allowlist for arbitrary admin-supplied
     URLs), costing some LCP on public marketing pages.
   - `cmsMedia` allows create/delete but not update (workflow annoyance).
4. Optional cleanup, not urgent: the real "Basic" package's orphaned
   fields (`durationDays`, `withdrawalLimitPerRequest`,
   `dailyWithdrawalLimit`).
5. Optional/design decision, not urgent: the packageless-user Locked-Mode
   withdrawal lockout edge case (a user who loses their package can lose
   access to already-earned, real Current Balance via the wallet lock).
6. Optional/lower-priority, not yet done: no automated test suite exists
   for any of this (all verification so far is manual/scripted QA, not
   checked-in tests) — consider adding one if long-term maintenance is a
   concern.
7. Optional: the admin users list's status filter is client-side
   (filters the already-fetched page), so "Archived" or other filters may
   need repeated "Load more" clicks to surface older matches on a large
   user base — fine at current scale, worth a real server-side query if
   the user base grows large.

## Exact next recommended task

Nothing blocking or known-broken remains anywhere in the application.
The platform is currently live with the new task-reward/rotation/
all-or-nothing-claim system and four production packages (Coca Basic/
Standard/Premium/Super Premium) — two real users
(`shahzaibpathan1243@gmail.com`, `jiniklo111@gmail.com`) have registered
since the earlier full account reset but hold no package yet, so they are
unaffected by this milestone. The next real task is whatever the next
feature/growth priority is, or admin creating the first real batch of ad
tasks (≥8 active tasks recommended, to fully cover the Super Premium
tier's 8-per-day limit without repeats feeling sparse).

## Manual setup already done

- `firebase-admin` + `server-only` npm packages installed.
- `.env.local` has the three `FIREBASE_ADMIN_*` vars (real, working
  service account credentials) — do not remove.
- `.env.example` documents what's needed for a fresh setup.

## Deploys performed (all explicitly approved by the user beforehand)

- `firestore` (rules + indexes) — Admin User Management's initial rules.
- `firestore:rules` — the `lastDailyClaimAt` critical fix.
- No hosting/functions deploy has ever been performed. No commits, no
  pushes.
- `firestore:rules` — the withdrawal-QA milestone's `transactions/{id}`
  `direction`-field validation, deployed 2026-07-27.
- `firestore:rules` — the `pendingBonusClaims` collection + the
  `bonusClaims` create-rule guard (recurring bonus-claim dedupe fix),
  deployed 2026-07-27, in two passes (initial version, then a read-rule
  null-dereference correction found during QA before either was relied on).
- `firestore:rules` — the global task-reward/daily-task-rotation/
  all-or-nothing-claim milestone (2026-07-28), deployed in four passes:
  (1) the initial approved diff (new `taskCompletions`/`dailyTaskProgress`/
  `taskRotations` collections, `settings/taskRewards`, the bundled claim
  rules, trimmed `tasks/{taskId}`); (2) the `taskCompletions` read-rule
  null-dereference fix found during QA; (3) the `dailyTaskQuotaMet`
  single-fetch refactor; (4) the `transactions` self-service
  `task_reward` branch fix. All four found-during-QA corrections are
  documented in the milestone section above.
- `firestore:rules` — the post-migration dead-code cleanup (2026-07-28):
  removed the `taskDailyCounters`/`taskCooldowns` match blocks and blocked
  `taskSubmissions` creates (`if false`). See the cleanup section above.
- `firestore:rules` — the manual payment-screenshot cleanup milestone
  (2026-07-28), deployed in two passes: (1) the approved
  `deposits/{id}` schema validation + `adminCanDeleteScreenshot()`;
  (2) the MIME-prefix regex fix found before QA. See the milestone
  section above. No Storage/Blaze/paid service involved at any point.
