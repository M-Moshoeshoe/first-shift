const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * The browser talks to the local Firebase emulators only when the switch is
 * on AND the page is served from this machine. A switch left on in a
 * production build therefore does nothing; /api/health still reports it.
 */
export function shouldUseEmulators(flag: string | undefined, hostname: string): boolean {
  return flag === "true" && LOCAL_HOSTS.has(hostname);
}

/**
 * The test-only sign-in: a development build AND the emulator switch AND a
 * local page. Production builds don't contain it at all; npm run budget
 * fails if its marker (src/config/testSignIn.ts) appears in the build.
 */
export function testSignInAllowed(nodeEnv: string | undefined, flag: string | undefined, hostname: string): boolean {
  return nodeEnv !== "production" && shouldUseEmulators(flag, hostname);
}

/** Ports from firebase.json. */
export const EMULATOR_PORTS = { auth: 9099, firestore: 8080, storage: 9199 } as const;
export const EMULATOR_HOST = "127.0.0.1";
