/**
 * Unit tests never see real settings: every secret, service setting and
 * emulator switch is cleared before any test runs, so the same tests pass on
 * a laptop, in Netlify's build (where the real values are set) and anywhere
 * else, and no unit test can reach a real service. A test that needs a value
 * sets it itself with vi.stubEnv.
 */
const SETTINGS = [
  "ANTHROPIC_API_KEY",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "ID_HASH_SECRET",
  "AI_DAILY_REQUESTS_PER_USER",
  "NEXT_PUBLIC_USE_EMULATORS",
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIREBASE_STORAGE_EMULATOR_HOST",
];

for (const name of Object.keys(process.env)) {
  if (SETTINGS.includes(name) || name.startsWith("NEXT_PUBLIC_FIREBASE_")) delete process.env[name];
}
