// NOT RUN — prepared for optional future use, per the "safe migration
// prepared but not executed" instruction from the withdrawal-notification
// privacy change (see src/lib/withdrawal-notification-text.ts and
// src/features/notifications/lib/withdrawal-notification-display.ts).
//
// Why this is optional, not required: the app already sanitizes every
// withdrawal notification's displayed text at RENDER time (client-side),
// regardless of what's actually stored in Firestore — so old notification
// documents with amount/account-number text baked into `body` are ALREADY
// invisible to users today, with no migration needed for correctness or
// privacy. This script exists only to optionally clean up the underlying
// stored data too (e.g. for future admin tooling that might read
// `userNotifications` directly, bypassing the app's own sanitizer).
//
// What it does: finds every userNotifications/{id} document with
// kind == "withdrawal" whose stored title/body doesn't already exactly
// match the canonical safe text for its status (inferred the same way the
// client-side sanitizer does — by checking whether the title contains
// "approved" / "rejected" / "pending"/"submitted"), and rewrites title+body
// to that canonical text. It NEVER changes kind, uid, read, readAt,
// createdAt, or announcementId. It never touches any other collection
// (withdrawals, users, wallets, transactions) — this only ever edits
// notification display text.
//
// Safety:
//   - Defaults to a DRY RUN: reports what it would change, writes nothing.
//   - Requires the literal flag --apply to write anything for real.
//   - Requires GOOGLE_APPLICATION_CREDENTIALS (or another Application
//     Default Credentials source) for the target Firebase project — this
//     script does not embed or prompt for any credentials itself.
//
// Usage (run manually, only when you're ready, never from CI):
//   node scripts/sanitize-withdrawal-notifications.mjs                # dry run
//   node scripts/sanitize-withdrawal-notifications.mjs --apply        # writes for real

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WITHDRAWAL_NOTIFICATION_TEXT = {
  approved: {
    title: "Withdrawal approved",
    body: "Your withdrawal request has been approved.",
  },
  rejected: {
    title: "Withdrawal rejected",
    body: "Your withdrawal request has been rejected.",
  },
  pending: {
    title: "Withdrawal submitted",
    body: "Your withdrawal request has been submitted and is pending review.",
  },
};

function resolveSafeText(title) {
  const lower = (title ?? "").toLowerCase();
  if (lower.includes("approved")) return WITHDRAWAL_NOTIFICATION_TEXT.approved;
  if (lower.includes("rejected")) return WITHDRAWAL_NOTIFICATION_TEXT.rejected;
  if (lower.includes("pending") || lower.includes("submitted")) return WITHDRAWAL_NOTIFICATION_TEXT.pending;
  return null; // Unrecognized title — skipped, never guessed at.
}

const apply = process.argv.includes("--apply");

const app = initializeApp({ credential: applicationDefault() });
const db = getFirestore(app);

const snapshot = await db.collection("userNotifications").where("kind", "==", "withdrawal").get();

let matched = 0;
let alreadyClean = 0;
let skippedUnrecognized = 0;
let batch = db.batch();
let batchCount = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  const safe = resolveSafeText(data.title);
  if (!safe) {
    skippedUnrecognized += 1;
    console.log(`SKIP (unrecognized title): ${doc.id} — title="${data.title}"`);
    continue;
  }
  if (data.title === safe.title && data.body === safe.body) {
    alreadyClean += 1;
    continue;
  }
  matched += 1;
  console.log(`${apply ? "UPDATING" : "WOULD UPDATE"}: ${doc.id}`);
  console.log(`  before: title="${data.title}" body="${data.body}"`);
  console.log(`  after:  title="${safe.title}" body="${safe.body}"`);
  if (apply) {
    batch.update(doc.ref, { title: safe.title, body: safe.body });
    batchCount += 1;
    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }
}

if (apply && batchCount > 0) {
  await batch.commit();
}

console.log("");
console.log(`Total withdrawal notifications scanned: ${snapshot.size}`);
console.log(`Already clean: ${alreadyClean}`);
console.log(`${apply ? "Updated" : "Would update"}: ${matched}`);
console.log(`Skipped (unrecognized title): ${skippedUnrecognized}`);
if (!apply) {
  console.log("\nDry run only — no writes made. Re-run with --apply to write for real.");
}
