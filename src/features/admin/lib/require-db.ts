import { db } from "@/lib/firebase/client";

export function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

export type Reviewer = {
  adminUid: string;
  adminName: string;
};
