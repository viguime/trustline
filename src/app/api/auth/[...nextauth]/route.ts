/**
 * Auth.js v5 — App Router catch-all handler
 *
 * Exports GET and POST from the central auth config so Next.js can route
 * all /api/auth/* requests (sign-in, sign-out, callbacks, session, csrf…)
 * through Auth.js without any duplication of configuration here.
 */
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
