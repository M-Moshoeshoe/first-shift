import "server-only";
import { claimCooldown } from "../rateLimit";
import { resetDemoWorld } from "../repositories/firestoreDemoWorld";
import { createDemoResetService, type DemoResetService } from "./demoResetService";

/** "Reset the demo" wired to Firestore. The route uses this; tests use fakes. */
export const liveDemoResetService = (): DemoResetService => createDemoResetService({ reset: resetDemoWorld, claimCooldown, now: () => new Date() });
