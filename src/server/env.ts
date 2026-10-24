import "server-only";
import { z } from "zod";
import { AI_LIMITS } from "@/config/ai";

const ServerEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1).optional(),
  ID_HASH_SECRET: z.string().min(32).optional(),
  AI_DAILY_REQUESTS_PER_USER: z.coerce.number().int().positive().default(AI_LIMITS.defaultDailyRequestsPerUser),
  // Set only for local work against the emulators; the Admin SDK reads them itself.
  FIRESTORE_EMULATOR_HOST: z.string().min(1).optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().min(1).optional(),
});
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= ServerEnvSchema.parse(process.env);
  return cached;
}

/** Which integrations are configured, without ever exposing a value. */
export function configStatus(): Record<"firebaseAdmin" | "anthropic" | "idHashing" | "photoStorage", boolean> {
  const env = serverEnv();
  return {
    firebaseAdmin: Boolean(env.FIREBASE_ADMIN_PROJECT_ID && env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY),
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    idHashing: Boolean(env.ID_HASH_SECRET),
    // Literal name, so this is the same build-time value the browser uploads to.
    photoStorage: Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  };
}

/**
 * True if anything emulator-related is switched on: the browser switch or any
 * server emulator host. Must be false on the live site (pre-submit checklist).
 * The switch is read by its literal name so Next.js inlines the build-time
 * value, the same one baked into the browser bundle.
 */
export function emulatorsOn(): boolean {
  const env = serverEnv();
  const browserSwitch = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
  return browserSwitch || Boolean(env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST);
}
