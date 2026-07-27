import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only Admin SDK singleton — the ONLY code in this app allowed to
// bypass Firestore security rules and manage Firebase Auth users directly
// (delete/inspect arbitrary accounts, which the client SDK can never do for
// anyone but the currently signed-in user). Never imported by a client
// component; the `server-only` import above makes that a build-time error
// if it ever happens by mistake.
let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;
  if (!projectId || !clientEmail || !privateKeyBase64) {
    throw new Error(
      "Firebase Admin SDK is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY_BASE64 in the server environment (never with a NEXT_PUBLIC_ prefix).",
    );
  }

  // The service account JSON's private_key is base64-encoded once at setup
  // time to avoid the well-known newline-escaping problems of pasting a
  // multi-line PEM key into a single-line env var — see .env.example.
  const privateKey = Buffer.from(privateKeyBase64, "base64").toString("utf8");

  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

// CRITICAL: this project's Firestore data lives in a named database called
// "default" — NOT the reserved "(default)" database that getFirestore(app)
// alone would target (see src/lib/firebase/client.ts's own comment on this
// exact footgun). Omitting the second argument here would silently point
// every admin read/write at a completely different, empty database.
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp(), "default");
}
