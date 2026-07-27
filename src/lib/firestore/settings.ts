import { doc, getDoc, setDoc, serverTimestamp, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const SETTINGS_PATH = "settings";
const GLOBAL_SETTINGS_ID = "global";
const OFFICIAL_CHANNEL_SETTINGS_ID = "officialChannel";
const WITHDRAWAL_RULES_SETTINGS_ID = "withdrawalRules";
const PAYMENT_SETTINGS_ID = "paymentDetails";
const TASK_REWARD_SETTINGS_ID = "taskRewards";

// A singleton config document, admin-managed. Absence of this document
// means every flag defaults to its "on" state — see firestore.rules
// `dailyClaimsGloballyEnabled()`, which treats a missing document the same
// as dailyClaimsEnabled: true, so the feature works out of the box without
// requiring an admin to explicitly flip it on first.
export type GlobalSettingsDoc = {
  dailyClaimsEnabled: boolean;
  updatedAt: Timestamp;
};

export function globalSettingsCollection(db: Firestore) {
  return typedCollection<GlobalSettingsDoc>(db, SETTINGS_PATH);
}

export function globalSettingsDocRef(db: Firestore) {
  return doc(globalSettingsCollection(db), GLOBAL_SETTINGS_ID);
}

export async function getGlobalSettings(db: Firestore): Promise<GlobalSettingsDoc | null> {
  const snapshot = await getDoc(globalSettingsDocRef(db));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function setDailyClaimsEnabled(db: Firestore, enabled: boolean): Promise<void> {
  await setDoc(globalSettingsDocRef(db), {
    dailyClaimsEnabled: enabled,
    updatedAt: serverTimestamp(),
  });
}

// A second singleton doc in the same `settings` collection — the Official
// Channel page's admin-editable links/banner, extended in Milestone 16 with
// real contact details (the CMS's "Contact information" requirement reuses
// this existing document rather than a competing one). Every field is
// optional (null when not yet configured), so the page can render
// gracefully before an admin has filled anything in.
export type OfficialChannelDoc = {
  telegramUrl: string | null;
  whatsappUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  bannerImageUrl: string | null;
  bannerText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  updatedAt: Timestamp;
};

export function officialChannelDocRef(db: Firestore) {
  return doc(typedCollection<OfficialChannelDoc>(db, SETTINGS_PATH), OFFICIAL_CHANNEL_SETTINGS_ID);
}

export async function getOfficialChannel(db: Firestore): Promise<OfficialChannelDoc | null> {
  const snapshot = await getDoc(officialChannelDocRef(db));
  return snapshot.exists() ? snapshot.data() : null;
}

export type OfficialChannelInput = {
  telegramUrl: string | null;
  whatsappUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  bannerImageUrl: string | null;
  bannerText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
};

export async function setOfficialChannel(db: Firestore, input: OfficialChannelInput): Promise<void> {
  await setDoc(officialChannelDocRef(db), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

// A fourth singleton doc in the same `settings` collection — the one
// central Easypaisa payment target shown on every deposit/package-purchase
// form (DepositForm, the package purchase modal). Seeded with real defaults
// below rather than requiring an admin to configure it before the platform
// is usable; getPaymentSettings falls back to those same defaults when the
// document doesn't exist yet, so every consumer sees a consistent value
// immediately, and the very first admin "Save" simply persists it for real.
export const DEFAULT_PAYMENT_ACCOUNT_TITLE = "ZOHAIB SALHARIA";
export const DEFAULT_PAYMENT_ACCOUNT_NUMBER = "03455340130";

export type PaymentSettingsDoc = {
  accountTitle: string;
  accountNumber: string;
  updatedAt: Timestamp;
};

export function paymentSettingsDocRef(db: Firestore) {
  return doc(typedCollection<PaymentSettingsDoc>(db, SETTINGS_PATH), PAYMENT_SETTINGS_ID);
}

export async function getPaymentSettings(db: Firestore): Promise<PaymentSettingsDoc | null> {
  const snapshot = await getDoc(paymentSettingsDocRef(db));
  return snapshot.exists() ? snapshot.data() : null;
}

export type PaymentSettingsInput = {
  accountTitle: string;
  accountNumber: string;
};

export async function setPaymentSettings(db: Firestore, input: PaymentSettingsInput): Promise<void> {
  await setDoc(paymentSettingsDocRef(db), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

// A third singleton doc in the same `settings` collection — the two
// admin-editable withdrawal gates: the minimum amount a Current Balance
// withdrawal must reach, and the direct-active-referral "Level" a
// Coca-Cola Earning withdrawal requires. Absence of this document falls
// back to the platform defaults (Rs 500, Level 10) — see firestore.rules
// `withdrawalRulesConfig()`.
export type WithdrawalRulesDoc = {
  currentBalanceMinWithdraw: number;
  cocaColaRequiredLevel: number;
  updatedAt: Timestamp;
};

export function withdrawalRulesDocRef(db: Firestore) {
  return doc(typedCollection<WithdrawalRulesDoc>(db, SETTINGS_PATH), WITHDRAWAL_RULES_SETTINGS_ID);
}

export async function getWithdrawalRules(db: Firestore): Promise<WithdrawalRulesDoc | null> {
  const snapshot = await getDoc(withdrawalRulesDocRef(db));
  return snapshot.exists() ? snapshot.data() : null;
}

export type WithdrawalRulesInput = {
  currentBalanceMinWithdraw: number;
  cocaColaRequiredLevel: number;
};

export async function setWithdrawalRules(db: Firestore, input: WithdrawalRulesInput): Promise<void> {
  await setDoc(withdrawalRulesDocRef(db), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

// A fifth singleton doc in the same `settings` collection — the one global
// flat reward paid per completed ad-watch task, read live at claim time by
// both the admin form (to show the current value) and firestore.rules'
// task-reward claim branch (to compute the trusted amount) — never copied
// onto a task or user document, so changing this value takes effect
// immediately for every existing and future task. Absence of this document
// falls back to the platform default (Rs 5) shown by the admin form; the
// very first "Save" simply persists it for real, same pattern as
// paymentDetails above.
export const DEFAULT_TASK_REWARD_PER_AD = 5;

export type TaskRewardSettingsDoc = {
  rewardPerAd: number;
  updatedAt: Timestamp;
};

export function taskRewardSettingsDocRef(db: Firestore) {
  return doc(typedCollection<TaskRewardSettingsDoc>(db, SETTINGS_PATH), TASK_REWARD_SETTINGS_ID);
}

export async function getTaskRewardSettings(db: Firestore): Promise<TaskRewardSettingsDoc | null> {
  const snapshot = await getDoc(taskRewardSettingsDocRef(db));
  return snapshot.exists() ? snapshot.data() : null;
}

export type TaskRewardSettingsInput = {
  rewardPerAd: number;
};

export async function setTaskRewardSettings(db: Firestore, input: TaskRewardSettingsInput): Promise<void> {
  await setDoc(taskRewardSettingsDocRef(db), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
