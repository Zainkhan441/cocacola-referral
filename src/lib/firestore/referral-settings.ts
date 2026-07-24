import {
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const REFERRAL_LEVEL_SETTINGS_PATH = "referralLevelSettings";
export const REFERRAL_LEVELS = 12;

export type RewardType = "percentage" | "fixed";

// One document per level (doc id = the level number as a string, e.g. "1"),
// admin-managed. The payout engine (see approveDeposit in
// features/admin/lib/deposit-actions.ts) is the only reader that matters for
// real money movement — a level whose document doesn't exist yet is treated
// as disabled/skipped, never defaulted to a hardcoded rate, per Milestone
// 11's "do not hardcode reward values" requirement.
export type ReferralLevelSettingDoc = {
  level: number;
  rewardType: RewardType;
  rewardValue: number;
  enabled: boolean;
  updatedAt: Timestamp;
};

// Seed values only — applied the first time each level is saved through the
// admin Referral Settings page (see features/admin/hooks/use-admin-referral-settings.ts).
// Never read by the payout engine itself.
export const DEFAULT_REFERRAL_LEVEL_RATES: Record<number, number> = {
  1: 10,
  2: 5,
  3: 3,
  4: 2,
  5: 2,
  6: 1,
  7: 1,
  8: 1,
  9: 0.5,
  10: 0.5,
  11: 0.5,
  12: 0.5,
};

export function referralLevelSettingsCollection(db: Firestore) {
  return typedCollection<ReferralLevelSettingDoc>(db, REFERRAL_LEVEL_SETTINGS_PATH);
}

export function referralLevelSettingDocRef(db: Firestore, level: number) {
  return doc(referralLevelSettingsCollection(db), String(level));
}

export async function getAllReferralLevelSettings(
  db: Firestore,
): Promise<ReferralLevelSettingDoc[]> {
  const snapshot = await getDocs(
    query(referralLevelSettingsCollection(db), orderBy("level", "asc")),
  );
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export type ReferralLevelSettingInput = {
  rewardType: RewardType;
  rewardValue: number;
  enabled: boolean;
};

export async function upsertReferralLevelSetting(
  db: Firestore,
  level: number,
  input: ReferralLevelSettingInput,
): Promise<void> {
  await setDoc(referralLevelSettingDocRef(db, level), {
    level,
    rewardType: input.rewardType,
    rewardValue: input.rewardValue,
    enabled: input.enabled,
    updatedAt: serverTimestamp(),
  });
}
