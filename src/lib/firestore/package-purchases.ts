import { doc, limit, orderBy, query, where, type Firestore, type Query, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const PACKAGE_PURCHASES_PATH = "packagePurchases";
const RECENT_PURCHASES_LIMIT = 20;

// An immutable, append-only record of every package purchase ever
// approved for a user — written once by the admin deposit-approval
// transaction, never updated. This is the only place "always fresh"
// package upgrades don't lose data: users/{uid}'s own package/activatedAt/
// expiresAt fields are overwritten on every new purchase, so this
// collection is what satisfies "preserve complete purchase history."
export type PackagePurchaseDoc = {
  uid: string;
  packageId: string;
  packageName: string;
  price: number;
  durationDays: number;
  depositId: string;
  purchasedAt: Timestamp;
  activatedAt: Timestamp;
  expiresAt: Timestamp;
  createdAt: Timestamp;
};

export function packagePurchasesCollection(db: Firestore) {
  return typedCollection<PackagePurchaseDoc>(db, PACKAGE_PURCHASES_PATH);
}

export function newPackagePurchaseRef(db: Firestore) {
  return doc(packagePurchasesCollection(db));
}

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function recentPackagePurchasesQuery(db: Firestore, uid: string): Query<PackagePurchaseDoc> {
  return query(
    packagePurchasesCollection(db),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(RECENT_PURCHASES_LIMIT),
  );
}
