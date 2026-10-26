import * as z from "zod/mini";
import { DEMO_ROLES } from "@/config/demo";
import { DEMO_MESSAGES } from "@/domain/messages";

// Zod's small build: the sign-in page reads the reply in the browser (docs/DESIGN.md, Performance).

/** POST /api/demo/sign-in. Shape only; the server checks the email and password against demoAccounts. */
export const DemoSignInSchema = z.object({
  email: z.string({ error: DEMO_MESSAGES.wrongCredentials }).check(z.trim(), z.minLength(3, DEMO_MESSAGES.wrongCredentials), z.maxLength(254, DEMO_MESSAGES.wrongCredentials)),
  password: z.string({ error: DEMO_MESSAGES.wrongCredentials }).check(z.minLength(1, DEMO_MESSAGES.wrongCredentials), z.maxLength(128, DEMO_MESSAGES.wrongCredentials)),
});

/** POST /api/demo/try: which demo account to sign in to, in one tap. */
export const DemoTrySchema = z.object({ role: z.enum(DEMO_ROLES, { error: DEMO_MESSAGES.noRole }) });

/** A custom token the browser signs in with, once. */
export const DemoTokenSchema = z.object({ token: z.string().check(z.minLength(1)) });
