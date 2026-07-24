import {
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const PACKAGES_PATH = "packages";

// Package definitions are fully admin-managed (Milestone 8). Clients read
// their own active package's limits or browse purchasable packages; only an
// admin may create/edit one. Referral payouts are NOT configured here — see
// referral-settings.ts's 12-level `referralLevelSettings`, the single source
// of truth for every level's reward rate (Milestone 11 removed the old
// single flat `referralBonus` field to avoid two competing reward sources).
export type PackageDoc = {
  id: string;
  name: string;
  price: number;
  dailyEarning: number;
  withdrawalLimitPerRequest: number;
  dailyWithdrawalLimit: number;
  // How long a purchase of this package stays active once approved — see
  // users/{uid}.packageExpiresAt, computed as activation + durationDays.
  durationDays: number;
  // Marketing bullet points shown on the packages page; purely descriptive,
  // never used in any earning/withdrawal/expiry calculation.
  features: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function packagesCollection(db: Firestore) {
  return typedCollection<PackageDoc>(db, PACKAGES_PATH);
}

export function packageDocRef(db: Firestore, packageId: string) {
  return doc(packagesCollection(db), packageId);
}

export async function getPackageDocument(
  db: Firestore,
  packageId: string,
): Promise<PackageDoc | null> {
  const snapshot = await getDoc(packageDocRef(db, packageId));
  return snapshot.exists() ? snapshot.data() : null;
}

// Packages realistically number in the tens, not thousands — a single
// unpaginated listener is simpler and correct at this scale.
export function allPackagesQuery(db: Firestore): Query<PackageDoc> {
  return query(packagesCollection(db), orderBy("createdAt", "desc"));
}

export type PackageInput = {
  name: string;
  price: number;
  dailyEarning: number;
  withdrawalLimitPerRequest: number;
  dailyWithdrawalLimit: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
};

export async function createPackage(
  db: Firestore,
  input: PackageInput,
): Promise<string> {
  const ref = doc(packagesCollection(db));
  await setDoc(ref, {
    id: ref.id,
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePackage(
  db: Firestore,
  packageId: string,
  input: PackageInput,
): Promise<void> {
  await updateDoc(packageDocRef(db, packageId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function setPackageActive(
  db: Firestore,
  packageId: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(packageDocRef(db, packageId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}
