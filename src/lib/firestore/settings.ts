import { doc, getDoc, setDoc, serverTimestamp, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const SETTINGS_PATH = "settings";
const GLOBAL_SETTINGS_ID = "global";
const OFFICIAL_CHANNEL_SETTINGS_ID = "officialChannel";
const WITHDRAWAL_RULES_SETTINGS_ID = "withdrawalRules";

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
