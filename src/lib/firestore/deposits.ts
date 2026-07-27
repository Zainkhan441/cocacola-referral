import {
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const DEPOSITS_PATH = "deposits";
const RECENT_DEPOSITS_LIMIT = 10;
export const DEPOSITS_PAGE_SIZE = 20;
const DEPOSIT_METHOD = "easypaisa" as const;

export type DepositStatus = "pending" | "approved" | "rejected";
export type DepositMethod = typeof DEPOSIT_METHOD;

// "available" once a screenshot is attached at submission; "deleted" once an
// admin has permanently removed it (see deleteDepositScreenshotAction). A
// `null` screenshotStatus means no screenshot was ever attached (it's
// optional at submission) — distinguished from "deleted" so the UI never
// confuses "there was never one" with "there was one, now gone."
export type DepositScreenshotStatus = "available" | "deleted";
export const SCREENSHOT_DELETION_REASON = "admin_manual_cleanup" as const;

export type DepositDoc = {
  uid: string;
  // Denormalized at submission time so the admin review queue can display
  // who a request is from without an extra read per row.
  userName: string;
  amount: number;
  method: DepositMethod;
  referenceId: string;
  // The Easypaisa number the payment was actually sent FROM — distinct from
  // the requester's own registration mobile number (users/{uid}.mobileNumber),
  // which may belong to someone else's account entirely.
  senderAccountNumber: string;
  // A compressed JPEG/PNG/WebP data URL (see payment-screenshots.ts), or
  // null if never attached, or null after an admin permanently deletes it
  // (see screenshotStatus for which case applies). This project stays on
  // the Spark (free) plan by design — no Firebase Storage, no paid service
  // — so proof images live directly on this document, capped small at
  // upload and admin-cleanable afterward so they never accumulate forever.
  screenshotUrl: string | null;
  // Approximate decoded (pre-base64) byte size of screenshotUrl, set once
  // at upload time — powers the admin screenshot-management dashboard's
  // size total without re-deriving it from a live string length on every
  // read. Null for any deposit with no screenshot, or one predating this
  // field.
  screenshotSizeBytes: number | null;
  screenshotStatus: DepositScreenshotStatus | null;
  // The four fields below are set ONLY by the admin-run
  // deleteDepositScreenshotAction transaction, exactly once — never by the
  // depositing user, never editable afterward (see firestore.rules
  // adminCanDeleteScreenshot()).
  screenshotDeletedAt: Timestamp | null;
  screenshotDeletedBy: string | null;
  screenshotDeletionReason: typeof SCREENSHOT_DELETION_REASON | null;
  // Set when this deposit is earmarked to purchase a package rather than
  // top up spendable balance. Approving it activates the package instead of
  // crediting walletBalance — see admin deposit-review logic.
  packageId: string | null;
  status: DepositStatus;
  reviewedBy: string | null;
  // Optional admin-entered context for the review decision (e.g. why a
  // deposit was rejected) — shown to the user alongside the status-change
  // notification. Null until an admin reviews the request.
  reviewNote: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function depositsCollection(db: Firestore) {
  return typedCollection<DepositDoc>(db, DEPOSITS_PATH);
}

export function depositDocRef(db: Firestore, depositId: string) {
  return doc(depositsCollection(db), depositId);
}

// A fresh auto-id ref, generated ahead of time so callers that need to know
// the id before committing (e.g. to mark it as a user's pending package
// purchase in the same transaction) can do so — see
// features/wallet/lib/actions.ts::submitDepositRequest.
export function newDepositRef(db: Firestore) {
  return doc(depositsCollection(db));
}

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function recentDepositsQuery(db: Firestore, uid: string): Query<DepositDoc> {
  return query(
    depositsCollection(db),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_DEPOSITS_LIMIT),
  );
}

// --- Admin review queues ---

// Requires a single-field index on createdAt (automatic).
export function depositsPageQuery(
  db: Firestore,
  cursor: QueryDocumentSnapshot<DepositDoc> | null,
): Query<DepositDoc> {
  return cursor
    ? query(depositsCollection(db), orderBy("createdAt", "desc"), startAfter(cursor), limit(DEPOSITS_PAGE_SIZE))
    : query(depositsCollection(db), orderBy("createdAt", "desc"), limit(DEPOSITS_PAGE_SIZE));
}

// Requires a composite index (status asc, createdAt desc) — see firestore.indexes.json.
export function depositsByStatusPageQuery(
  db: Firestore,
  status: DepositStatus,
  cursor: QueryDocumentSnapshot<DepositDoc> | null,
): Query<DepositDoc> {
  return cursor
    ? query(
        depositsCollection(db),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(DEPOSITS_PAGE_SIZE),
      )
    : query(
        depositsCollection(db),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(DEPOSITS_PAGE_SIZE),
      );
}

// Existence-check only (limit 1) — used by admin package deletion to refuse
// deleting a package with a purchase still awaiting review (approving it
// later would fail once the package document is gone). Requires a
// composite index (packageId asc, status asc) — see firestore.indexes.json.
export function pendingDepositsForPackageQuery(db: Firestore, packageId: string): Query<DepositDoc> {
  return query(
    depositsCollection(db),
    where("packageId", "==", packageId),
    where("status", "==", "pending"),
    limit(1),
  );
}

// Every deposit that has ever had a screenshot attached (available or
// already deleted) — feeds the admin screenshot-management dashboard's
// stats and list. A single-field "in" filter needs no composite index.
// Realistic volume for a "clean up regularly" workflow is small, so one
// unpaginated fetch (mirroring packages/tasks elsewhere in this app) is
// simpler and correct at this scale.
export function depositsWithScreenshotHistoryQuery(db: Firestore): Query<DepositDoc> {
  return query(depositsCollection(db), where("screenshotStatus", "in", ["available", "deleted"]));
}

type CreateDepositRequestInput = {
  uid: string;
  userName: string;
  amount: number;
  referenceId: string;
  senderAccountNumber: string;
  screenshotUrl: string | null;
  screenshotSizeBytes: number | null;
  packageId: string | null;
};

// Exported so callers that need to write this alongside other documents in
// the same atomic transaction (see features/wallet/lib/actions.ts) can
// build the exact same shape without duplicating it.
export function buildDepositData(input: CreateDepositRequestInput) {
  return {
    uid: input.uid,
    userName: input.userName,
    amount: input.amount,
    method: DEPOSIT_METHOD,
    referenceId: input.referenceId,
    senderAccountNumber: input.senderAccountNumber,
    screenshotUrl: input.screenshotUrl,
    screenshotSizeBytes: input.screenshotUrl ? input.screenshotSizeBytes : null,
    screenshotStatus: input.screenshotUrl ? ("available" as const) : null,
    screenshotDeletedAt: null,
    screenshotDeletedBy: null,
    screenshotDeletionReason: null,
    packageId: input.packageId,
    status: "pending" as const,
    reviewedBy: null,
    reviewNote: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

// Plain wallet top-up only (packageId: null) — a package-purchase deposit
// must instead go through submitDepositRequest's transaction, since it also
// needs to atomically mark the requester's profile as having a pending
// purchase.
export async function createDepositRequest(
  db: Firestore,
  input: CreateDepositRequestInput,
): Promise<void> {
  await setDoc(newDepositRef(db), buildDepositData(input));
}
