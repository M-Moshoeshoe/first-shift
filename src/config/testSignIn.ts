/**
 * Carried by the test-only emulator sign-in and nothing else. npm run budget
 * fails if this text appears anywhere in a production build, which proves the
 * test sign-in was left out. Import it only from that component and scripts.
 */
export const TEST_SIGN_IN_MARKER = "first-shift-test-sign-in-not-for-production";
