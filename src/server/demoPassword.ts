import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * The demo accounts' passwords, kept only as a salted scrypt hash in the
 * server-only demoAccounts collection (scripts/createDemoAccounts.ts writes
 * it). The passwords themselves are public, in the slides; hashing keeps
 * whatever the developer chooses out of the database all the same.
 */
export interface DemoPasswordHash {
  salt: string;
  hash: string;
}

const KEY_LENGTH = 32;
const derive = (password: string, salt: string): Buffer => scryptSync(password, Buffer.from(salt, "hex"), KEY_LENGTH);

export function hashDemoPassword(password: string): DemoPasswordHash {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: derive(password, salt).toString("hex") };
}

export function demoPasswordMatches(password: string, stored: DemoPasswordHash): boolean {
  const expected = Buffer.from(stored.hash, "hex");
  const actual = derive(password, stored.salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
