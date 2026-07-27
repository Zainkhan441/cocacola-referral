import "server-only";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export class AdminRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type VerifiedAdminCaller = {
  uid: string;
  name: string;
};

// The anti-abuse core of every admin-only server route in this app: never
// trust a uid/role passed in the request body — always re-derive the
// caller's identity from a real, signed, current Firebase ID token, then
// re-check their role against Firestore (via the Admin SDK, which bypasses
// rules, so this read is authoritative regardless of what the rules would
// otherwise allow a client to see). Throws AdminRequestError with the
// correct HTTP status for the route to translate into a Response.
export async function requireAdminCaller(request: Request): Promise<VerifiedAdminCaller> {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!idToken) {
    throw new AdminRequestError(401, "Missing bearer token.");
  }

  const decoded = await getAdminAuth()
    .verifyIdToken(idToken)
    .catch(() => null);
  if (!decoded) {
    throw new AdminRequestError(401, "Invalid or expired session.");
  }

  const snap = await getAdminDb().collection("users").doc(decoded.uid).get();
  const data = snap.data();
  if (!snap.exists || data?.role !== "admin") {
    throw new AdminRequestError(403, "Admin privileges required.");
  }

  return { uid: decoded.uid, name: (data?.fullName as string | undefined) ?? decoded.uid };
}
