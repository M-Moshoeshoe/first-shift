import { getApps, initializeApp as initializeAdmin } from "firebase-admin/app";
import { GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import { ApiError, apiPost } from "../../src/lib/api";
import { clientAuth } from "../../src/lib/firebaseClient";
import { clientStorage } from "../../src/lib/firebaseStorage";
import { SaveResultSchema } from "../../src/schemas/profile";

/**
 * Shared set-up for the end-to-end checks in scripts/e2e. They call the real
 * client code (src/lib) against a running dev server and the emulators, and
 * refuse to run anywhere else. Never imported by app code.
 */
export const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-first-shift";
export const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${PROJECT}.appspot.com`;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Emulators or nothing: these checks never touch a real project. */
export function requireEmulators(hosts: readonly string[]): void {
  const missing = [...hosts.filter((name) => !process.env[name]), ...(process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ? [] : ["NEXT_PUBLIC_USE_EMULATORS=true"])];
  if (missing.length === 0) return;
  console.error(`Refusing to run: set ${missing.join(", ")} (see README). These checks only ever run against the emulators.`);
  process.exit(1);
}

/**
 * The emulator guard in firebaseClient.ts reads the page's hostname, and the
 * app calls its own routes with relative paths, as a browser would. This is
 * the one place a script stands in for a page.
 */
export function standInForBrowser(): void {
  Object.assign(globalThis, { window: { location: { hostname: "localhost" } } });
  clientAuth();
  clientStorage();
  Reflect.deleteProperty(globalThis, "window");
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => realFetch(typeof input === "string" && input.startsWith("/") ? `${BASE}${input}` : input, init);
}

export async function clearEmulators(): Promise<void> {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
}

/** The Auth emulator accepts an unsigned Google credential, so no real Google account is involved. */
export async function signInAs(sub: string): Promise<string> {
  await signOut(clientAuth());
  const credential = GoogleAuthProvider.credential(JSON.stringify({ sub, email: `${sub}@example.com`, email_verified: true }));
  return (await signInWithCredential(clientAuth(), credential)).user.uid;
}

export const post = (path: string, body: unknown) => apiPost(path, body, SaveResultSchema);

/** Runs a call that must fail and reports how, as the person would see it. */
export async function refusal(call: () => Promise<unknown>): Promise<{ status: number; code: string; message: string }> {
  try {
    await call();
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, code: error.code, message: error.message };
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
    return { status: 0, code, message: error instanceof Error ? error.message : String(error) };
  }
  throw new Error("expected this call to be refused");
}

export function adminApp() {
  return getApps()[0] ?? initializeAdmin({ projectId: PROJECT, storageBucket: BUCKET });
}

export function run(main: () => Promise<void>): void {
  main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
