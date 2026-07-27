import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { createDepositRequest, buildDepositData, newDepositRef } from "@/lib/firestore/deposits";
import {
  buildWithdrawalData,
  newWithdrawalRef,
  pendingWithdrawalFieldFor,
  type WithdrawalSourceWallet,
} from "@/lib/firestore/withdrawals";
import { userDocRef } from "@/lib/firestore/users";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

type SubmitDepositInput = {
  uid: string;
  userName: string;
  amount: number;
  referenceId: string;
  senderAccountNumber: string;
  screenshotUrl: string | null;
  packageId: string | null;
};

export async function submitDepositRequest(input: SubmitDepositInput) {
  const firestore = requireDb();

  if (!input.packageId) {
    await createDepositRequest(firestore, input);
    return;
  }

  // A package-purchase deposit must atomically mark the requester's own
  // profile as having a pending purchase — the sole mechanism (both here
  // and in firestore.rules' ownerCanMarkPendingPurchase) preventing a
  // second package-purchase request while this one still awaits review.
  const depositRef = newDepositRef(firestore);
  await runTransaction(firestore, async (transaction) => {
    const userRef = userDocRef(firestore, input.uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("Your profile could not be found.");
    }
    if (userSnap.data().pendingPackagePurchaseId) {
      throw new Error("You already have a package purchase awaiting review.");
    }

    transaction.set(depositRef, buildDepositData(input));
    transaction.update(userRef, {
      pendingPackagePurchaseId: depositRef.id,
      updatedAt: serverTimestamp(),
    });
  });
}

type SubmitWithdrawalInput = {
  uid: string;
  userName: string;
  amount: number;
  sourceWallet: WithdrawalSourceWallet;
  accountName: string;
  accountNumber: string;
};

// A withdrawal request must atomically mark the requester's own profile as
// having a pending request against THIS specific wallet — the sole
// mechanism (both here and in firestore.rules' ownerCanMarkPendingWithdrawal)
// preventing a user from piling up multiple simultaneous pending requests
// against the same wallet. Current Balance and Coca-Cola Earning are gated
// independently, so one pending request per wallet can coexist.
export async function submitWithdrawalRequest(input: SubmitWithdrawalInput) {
  const firestore = requireDb();
  const withdrawalRef = newWithdrawalRef(firestore);
  const pendingField = pendingWithdrawalFieldFor(input.sourceWallet);

  await runTransaction(firestore, async (transaction) => {
    const userRef = userDocRef(firestore, input.uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("Your profile could not be found.");
    }
    if (userSnap.data()[pendingField]) {
      throw new Error("You already have a withdrawal request awaiting review for this wallet.");
    }

    transaction.set(withdrawalRef, buildWithdrawalData(input));
    transaction.update(userRef, {
      [pendingField]: withdrawalRef.id,
      updatedAt: serverTimestamp(),
    });
  });
}
