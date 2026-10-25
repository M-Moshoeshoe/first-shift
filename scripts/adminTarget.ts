/**
 * Shared by the admin scripts: says which Firebase project they're about to
 * touch, the emulators or the live one, before anything happens. They need
 * the Admin credentials in .env.local, which only the developer holds.
 */
export function announceTarget(): string {
  const project = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "demo-first-shift";
  const emulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
  if (!emulators && !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    console.error("Refusing to run: no Admin credentials. Fill in .env.local (docs/DEPLOY.md, part 3), or start the emulators and set FIRESTORE_EMULATOR_HOST.");
    process.exit(1);
  }
  console.log(`Target: ${emulators ? "the emulators" : `the LIVE project ${project}`}`);
  return project;
}

/** The value after --name, or undefined. */
export function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}
