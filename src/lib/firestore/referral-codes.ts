import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";
import { generateReferralCode } from "@/lib/referral/code";
import { REFERRAL_LEVELS } from "@/lib/firestore/team-members";

const REFERRAL_CODES_PATH = "referralCodes";
const MAX_GENERATION_ATTEMPTS = 5;
// A code's own ancestorChain holds only its owner's ancestors (levels 1..11
// relative to them) — one level shorter than REFERRAL_LEVELS, since a new
// signup under this code adds the owner themselves as that signup's level 1,
// making the signup's own full chain [owner, ...ownerAncestorChain] up to 12.
const MAX_ANCESTOR_CHAIN_LENGTH = REFERRAL_LEVELS - 1;

// Keyed by the referral code itself (not an auto-id) so lookups and the
// uniqueness check below are both single-document reads, no query/index needed.
export type ReferralCodeDoc = {
  uid: string;
  // This code owner's own referredBy chain (nearest ancestor first), capped
  // at MAX_ANCESTOR_CHAIN_LENGTH. Publicly gettable (see firestore.rules) so
  // a brand-new signup — who cannot yet read anyone else's profile — can
  // resolve their own full 12-level ancestor chain from this single public
  // document instead of needing elevated reads. Self-reported by the owner
  // at signup time; see team-members.ts's trust-boundary note for why this is
  // safe (it's a display-only input, never used to compute money).
  ancestorChain: string[];
  createdAt: Timestamp;
};

export function referralCodesCollection(db: Firestore) {
  return typedCollection<ReferralCodeDoc>(db, REFERRAL_CODES_PATH);
}

export function referralCodeDocRef(db: Firestore, code: string) {
  return doc(referralCodesCollection(db), code);
}

export type ReferrerInfo = {
  uid: string;
  ancestorChain: string[];
};

export async function resolveReferrerByCode(
  db: Firestore,
  code: string,
): Promise<ReferrerInfo | null> {
  const snapshot = await getDoc(referralCodeDocRef(db, code));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { uid: data.uid, ancestorChain: data.ancestorChain };
}

// Atomically claims a randomly generated code for `uid`. Uses a transaction
// so two users can never be assigned the same code, however unlikely a
// collision would be — this is the real uniqueness guarantee, not just a
// generate-then-check that could still race.
export async function claimUniqueReferralCode(
  db: Firestore,
  uid: string,
  ancestorChain: string[],
): Promise<string> {
  const cappedChain = ancestorChain.slice(0, MAX_ANCESTOR_CHAIN_LENGTH);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateReferralCode();
    const claimed = await runTransaction(db, async (transaction) => {
      const codeRef = referralCodeDocRef(db, candidate);
      const existing = await transaction.get(codeRef);
      if (existing.exists()) {
        return false;
      }
      transaction.set(codeRef, {
        uid,
        ancestorChain: cappedChain,
        createdAt: serverTimestamp(),
      });
      return true;
    });

    if (claimed) {
      return candidate;
    }
  }

  throw new Error(
    "Could not generate a unique referral code. Please try again.",
  );
}
