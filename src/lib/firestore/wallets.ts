import { doc, serverTimestamp, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const WALLETS_PATH = "wallets";

export type WalletDoc = {
  uid: string;
  // Deposit/Recharge Balance mirror — see users/{uid}.walletBalance.
  balance: number;
  currentBalance: number;
  cocaColaEarning: number;
  staffEarning: number;
  totalEarnings: number;
  pendingEarnings: number;
  updatedAt: Timestamp;
};

export function walletsCollection(db: Firestore) {
  return typedCollection<WalletDoc>(db, WALLETS_PATH);
}

export function walletDocRef(db: Firestore, uid: string) {
  return doc(walletsCollection(db), uid);
}

// Exported so callers that need to write this alongside other documents in
// the same atomic batch (see features/auth/lib/profile-setup.ts) can build
// the exact same shape without duplicating it.
export function buildInitialWalletData(uid: string) {
  return {
    uid,
    balance: 0,
    currentBalance: 0,
    cocaColaEarning: 0,
    staffEarning: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    updatedAt: serverTimestamp(),
  };
}
