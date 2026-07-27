export type UserRole = "user" | "admin";

// Firebase Auth has no concept of app roles — the authoritative role lives
// only on the Firestore users/{uid} document (see UserDoc.role), which is
// frozen from every client write. Never add a role field here: Auth state
// resolves before Firestore, so it would either be wrong or fake, and any
// admin-gating decision must read the live Firestore profile instead.
export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};
