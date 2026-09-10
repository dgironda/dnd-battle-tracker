/**
 * GET /api/patreon/health → which pieces of the Patreon gate are configured.
 *
 * This exists because the gate has four separate configuration dependencies and
 * there was no way to tell whether any of them were satisfied without asking a
 * real patron to attempt a real sign-in. Two rounds of "it is still broken"
 * went by one missing value at a time — session secret, then client secret,
 * then client id and redirect together — and every one of them was a single
 * curl away from being obvious.
 *
 * Booleans only. It says whether each value is PRESENT, never what it is, so
 * this is safe to leave open and safe to paste into a chat.
 *
 * The trap it is built around: PATREON_CLIENT_ID and PATREON_REDIRECT_URI also
 * exist as VITE_-prefixed build-time vars, and it is natural to assume the
 * server can see those too. It cannot, when the build happens on a laptop and
 * only `dist` is uploaded — Cloudflare never receives them. `source` says which
 * name each value actually came from, so that assumption is visible rather than
 * something to be discovered from a failed sign-in.
 */

import { clientId, redirectUri, type PatreonEnv } from "../../../server/patreon";

interface Env extends PatreonEnv {
  PATREON_SESSION_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = ({ env }) => {
  const checks = {
    /* Signs the session cookie. Without it nothing can be verified at all. */
    sessionSecret: !!env.PATREON_SESSION_SECRET,
    /* Exchanges the code. Without it no one can sign in. */
    clientSecret: !!env.PATREON_CLIENT_SECRET,
    clientId: !!clientId(env),
    redirectUri: !!redirectUri(env),
    /* Optional, but without it any active pledge to ANY creator counts. */
    campaignId: !!env.PATREON_CAMPAIGN_ID,
  };

  const required = ["sessionSecret", "clientSecret", "clientId", "redirectUri"] as const;
  const missing = required.filter((name) => !checks[name]);

  return new Response(
    JSON.stringify(
      {
        ok: missing.length === 0,
        missing,
        checks,
        source: {
          clientId: env.PATREON_CLIENT_ID
            ? "PATREON_CLIENT_ID"
            : env.VITE_PATREON_CLIENT_ID
              ? "VITE_PATREON_CLIENT_ID"
              : null,
          redirectUri: env.PATREON_REDIRECT_URI
            ? "PATREON_REDIRECT_URI"
            : env.VITE_PATREON_REDIRECT_URI
              ? "VITE_PATREON_REDIRECT_URI"
              : null,
        },
        warning: checks.campaignId
          ? null
          : "PATREON_CAMPAIGN_ID is not set: a patron of any creator will count as a supporter here.",
      },
      null,
      2,
    ),
    {
      /* 503 when it cannot work, so a deploy check can watch the status code
         rather than having to parse this. */
      status: missing.length === 0 ? 200 : 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
};
