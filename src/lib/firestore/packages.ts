import {
  deleteDoc,
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

// Package definitions are fully admin-managed. Clients read their own
// active package's limits or browse purchasable packages; only an admin may
// create/edit one. A package never expires once purchased — it stays active
// indefinitely until an admin manually disables it (isActive: false) or the
// holder purchases a different package (see approveDeposit's "always
// fresh" replacement). Referral payout is a single flat amount per package
// (paid once, to the purchaser's direct referrer only, on approval — not a
// multi-level commission structure).
export type PackageDoc = {
  id: string;
  name: string;
  price: number;
  dailyEarning: number;
  // Paid once to the purchaser's direct referrer's Staff Earning wallet when
  // a deposit for this package is approved — see approveDeposit. Rs 0 (or
  // no referrer) means no commission is paid.
  referralCommission: number;
  // Maximum number of task completions per day for a holder of this
  // package — resets every rolling 24h window, same mechanism as an
  // individual daily task's own cooldown (see taskCooldowns.ts).
  dailyTaskLimit: number;
  // Marketing bullet points shown on the packages page; purely descriptive,
  // never used in any earning/withdrawal calculation.
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
  referralCommission: number;
  dailyTaskLimit: number;
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

// Permanent removal of the package document. Callers MUST verify (via
// usersWithPackageQuery / pendingDepositsForPackageQuery) that no user
// currently holds this package and no pending deposit references it before
// calling this — see deletePackageAction, which is the only caller. This
// function itself performs no safety checks; it's a thin wrapper so that
// invariant lives in exactly one place.
export async function deletePackage(db: Firestore, packageId: string): Promise<void> {
  await deleteDoc(packageDocRef(db, packageId));
}
