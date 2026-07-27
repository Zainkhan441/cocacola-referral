import {
  doc,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  serverTimestamp,
  where,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";
import type { UserRole } from "@/features/auth/types";

const USERS_PATH = "users";
export const USERS_PAGE_SIZE = 20;
// Highest-codepoint character, used as the upper bound of a Firestore
// prefix-range query (matches every string starting with the prefix).
const PREFIX_RANGE_END = "";

// active: normal use. suspended: temporary admin hold, reversible via
// Unsuspend — meant for short-term policy issues. archived: a long-term
// admin soft-remove, reversible via Restore — hidden from the default admin
// user list, meant for accounts an admin has decided to retire/deactivate
// (e.g. inactive, duplicate, or a closure request) without deleting
// anything. banned: reserved, not currently exposed in the admin UI.
// Suspended/archived/banned all block sign-in and every self-service
// financial write (see firestore.rules isActiveAccount()) — this is
// enforced server-side, not just hidden buttons.
export type AccountStatus = "active" | "suspended" | "archived" | "banned";

export type UserDoc = {
  uid: string;
  fullName: string;
  // Lowercased fullName, computed once at signup, used for admin prefix
  // search — Firestore has no native full-text search. Accounts created
  // before this field existed won't match name search until it's backfilled.
  fullNameLower: string;
  email: string;
  // Collected at signup, separate from any per-deposit "sender Easypaisa
  // number" (see DepositDoc.senderAccountNumber) — this is the account's
  // own contact number, never assumed to be the number a payment was sent
  // from.
  mobileNumber: string;
  referralCode: string;
  referredBy: string | null;
  // Deposit/Recharge Balance — the ONLY thing that ever credits this field
  // is an approved plain top-up deposit (never task/daily/referral earnings
  // — deposited money and earned money are never mixed). Denormalized copy
  // of wallets/{uid}.balance for fast dashboard reads without a second
  // fetch; any future mutation must update both documents together.
  walletBalance: number;
  // Current Balance — credited ONLY by approved task completions.
  // Independently withdrawable, gated by an admin-editable minimum amount
  // (see settings/withdrawalRules).
  currentBalance: number;
  // Coca-Cola Earning — credited ONLY by the automatic daily package
  // earning engine (never by a manual claim). Independently withdrawable,
  // gated by the user's own direct-active-referral count reaching an
  // admin-editable required level (default 10; see settings/withdrawalRules).
  cocaColaEarning: number;
  // Staff Earning — credited ONLY by the 12-level referral commission
  // engine, automatically on a downline package approval. Not directly
  // withdrawable; admin may manually adjust it.
  staffEarning: number;
  // Lifetime sum of every currentBalance/cocaColaEarning/staffEarning
  // credit (never deposits) — a historical "total earned" figure, kept in
  // sync by every earning-crediting write site.
  totalEarnings: number;
  pendingEarnings: number;
  // Today's Coca-Cola (daily package) earning amount specifically — set by
  // the daily earning engine only, unrelated to task/referral earnings.
  todayEarnings: number;
  // Denormalized counts of downstream referrals for the same reason as the
  // balance fields above — the security rules only let a user read their own
  // profile, so there is no query that could count other users' `referredBy`
  // matches. The referral-crediting engine (a later milestone) is the writer;
  // both are real, accurate zeros until then, not placeholder UI values.
  totalReferrals: number;
  activeReferrals: number;
  package: string | null;
  // Package lifecycle — all admin-set, only ever together, at deposit
  // approval time. "Always fresh" semantics: a new package purchase always
  // replaces these three wholesale (activatedAt = approval time, expiresAt
  // = activatedAt + that package's durationDays) — never stacked/extended
  // from a still-active previous package. purchasedAt is the original
  // deposit's submission time, kept distinct from activatedAt (which can be
  // later, if admin review takes a while) for an honest purchase record.
  packagePurchasedAt: Timestamp | null;
  packageActivatedAt: Timestamp | null;
  packageExpiresAt: Timestamp | null;
  // Snapshotted from the package's own dailyEarning/dailyTaskLimit at the
  // moment THIS purchase was approved (see approveDeposit) — never re-read
  // from the live packages/{id} document afterward. This is what protects
  // an existing holder from an admin later editing the package template:
  // the terms they were approved under are frozen here, not recomputed.
  // Null on accounts created (or last approved) before this field existed;
  // every reader treats null as "fall back to the package's current live
  // value" so no historical data needed to change for this to ship safely.
  packageDailyEarning: number | null;
  packageDailyTaskLimit: number | null;
  // Set atomically with a pending package-purchase deposit's own creation,
  // cleared when that deposit is approved or rejected — the single source
  // of truth Firestore rules use to block a second package-purchase
  // request while one is still awaiting review.
  pendingPackagePurchaseId: string | null;
  // Same one-pending-request-per-wallet pattern as pendingPackagePurchaseId
  // above, but for withdrawals — one marker per independently-withdrawable
  // wallet, so a user can't submit an unbounded number of simultaneous
  // pending withdrawal requests against the same wallet. Set atomically with
  // the withdrawal's own creation, cleared on approve/reject. See
  // firestore.rules `ownerCanMarkPendingWithdrawal`.
  pendingWithdrawalCurrentBalance: string | null;
  pendingWithdrawalCocaColaEarning: string | null;
  // The UTC-calendar-day gate Firestore rules use for the automatic daily
  // package earning credit (see firestore.rules `canClaimDaily`/
  // `isNewUtcDay`) — a new credit is allowed once `request.time` falls on a
  // later UTC calendar date than this timestamp, not after a fixed 24h
  // duration.
  lastDailyClaimAt: Timestamp | null;
  // Milestone 13 Settings preferences — all self-editable, none affecting
  // money/role/access. notificationsEnabled is checked by the admin
  // notification fan-out at send time (a user who's opted out never gets a
  // userNotifications delivery doc written for them, not just a hidden one).
  // themePreference/languagePreference are stored-only for now (see
  // features/settings) — real light theme and translated UI are out of
  // scope for this milestone by explicit product decision.
  notificationsEnabled: boolean;
  themePreference: "dark" | "light" | "system";
  languagePreference: "en" | "ur";
  accountStatus: AccountStatus;
  role: UserRole;
  // No email-verification flow exists — every account is usable immediately
  // after signup. Kept (always true for new users) only because existing
  // documents already carry it; nothing reads it for access control anymore.
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function usersCollection(db: Firestore) {
  return typedCollection<UserDoc>(db, USERS_PATH);
}

export function userDocRef(db: Firestore, uid: string) {
  return doc(usersCollection(db), uid);
}

type CreateUserDocumentInput = {
  uid: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  referralCode: string;
  referredBy: string | null;
};

// Exported so callers that need to write this alongside other documents in
// the same atomic batch (see features/auth/lib/profile-setup.ts) can build
// the exact same shape without duplicating it.
export function buildInitialUserData(input: CreateUserDocumentInput) {
  return {
    uid: input.uid,
    fullName: input.fullName,
    fullNameLower: input.fullName.trim().toLowerCase(),
    email: input.email,
    mobileNumber: input.mobileNumber,
    referralCode: input.referralCode,
    referredBy: input.referredBy,
    walletBalance: 0,
    currentBalance: 0,
    cocaColaEarning: 0,
    staffEarning: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    todayEarnings: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    package: null,
    packagePurchasedAt: null,
    packageActivatedAt: null,
    packageExpiresAt: null,
    packageDailyEarning: null,
    packageDailyTaskLimit: null,
    pendingPackagePurchaseId: null,
    pendingWithdrawalCurrentBalance: null,
    pendingWithdrawalCocaColaEarning: null,
    lastDailyClaimAt: null,
    notificationsEnabled: true,
    themePreference: "dark" as const,
    languagePreference: "en" as const,
    accountStatus: "active" as const,
    role: "user" as const,
    emailVerified: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

// --- Admin-only: listing, search, and account mutation ---

export function usersPageQuery(
  db: Firestore,
  cursor: QueryDocumentSnapshot<UserDoc> | null,
): Query<UserDoc> {
  return cursor
    ? query(usersCollection(db), orderBy("createdAt", "desc"), startAfter(cursor), limit(USERS_PAGE_SIZE))
    : query(usersCollection(db), orderBy("createdAt", "desc"), limit(USERS_PAGE_SIZE));
}

export function searchUsersByNameQuery(db: Firestore, term: string): Query<UserDoc> {
  const lower = term.trim().toLowerCase();
  return query(
    usersCollection(db),
    orderBy("fullNameLower"),
    where("fullNameLower", ">=", lower),
    where("fullNameLower", "<=", lower + PREFIX_RANGE_END),
    limit(USERS_PAGE_SIZE),
  );
}

export function searchUsersByEmailQuery(db: Firestore, email: string): Query<UserDoc> {
  return query(usersCollection(db), where("email", "==", email.trim()), limit(USERS_PAGE_SIZE));
}

export function searchUsersByReferralCodeQuery(db: Firestore, code: string): Query<UserDoc> {
  return query(
    usersCollection(db),
    where("referralCode", "==", code.trim().toUpperCase()),
    limit(USERS_PAGE_SIZE),
  );
}

// Existence-check only (limit 1), never for listing/pagination — used by
// admin package deletion to refuse deleting a package still assigned to at
// least one user (see features/admin/lib/package-actions.ts).
export function usersWithPackageQuery(db: Firestore, packageId: string): Query<UserDoc> {
  return query(usersCollection(db), where("package", "==", packageId), limit(1));
}

export async function setUserPackage(
  db: Firestore,
  uid: string,
  packageId: string | null,
): Promise<void> {
  await updateDoc(userDocRef(db, uid), {
    package: packageId,
    updatedAt: serverTimestamp(),
  });
}

// --- Settings page: self-service profile/preference updates ---
// Every field here is in ownerCanUpdateUser()'s allowed list — nothing
// money/role/access-related is ever touched by these.

export async function updateFullName(db: Firestore, uid: string, fullName: string): Promise<void> {
  await updateDoc(userDocRef(db, uid), {
    fullName,
    fullNameLower: fullName.trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  });
}

export async function setNotificationsEnabled(
  db: Firestore,
  uid: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(userDocRef(db, uid), {
    notificationsEnabled: enabled,
    updatedAt: serverTimestamp(),
  });
}

export async function setThemePreference(
  db: Firestore,
  uid: string,
  theme: UserDoc["themePreference"],
): Promise<void> {
  await updateDoc(userDocRef(db, uid), {
    themePreference: theme,
    updatedAt: serverTimestamp(),
  });
}

export async function setLanguagePreference(
  db: Firestore,
  uid: string,
  language: UserDoc["languagePreference"],
): Promise<void> {
  await updateDoc(userDocRef(db, uid), {
    languagePreference: language,
    updatedAt: serverTimestamp(),
  });
}
