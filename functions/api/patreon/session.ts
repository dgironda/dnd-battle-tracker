/**
 * GET    /api/patreon/session → { isSupporter, personId }
 * DELETE /api/patreon/session → signs out
 *
 * This is what makes the gate real. The browser no longer decides whether it is
 * a supporter by reading its own localStorage; it asks, and the answer comes
 * from verifying a signature the browser cannot produce.
 *
 * An unsigned-in visitor is not an error — this answers 200 with
 * `isSupporter: false`, because "no" is a perfectly good answer to the
 * question and a 401 would make every first visit look like a fault.
 */

import {
  clearedCookie,
  cookieFrom,
  readSession,
  SESSION_COOKIE,
  type PatreonEnv,
} from "../../../server/patreon";

interface Env extends PatreonEnv {
  PATREON_SESSION_SECRET?: string;
}

const ANONYMOUS = { isSupporter: false, personId: null, available: true };

/**
 * The server cannot answer the question at all.
 *
 * This is NOT the same as "not a supporter", and conflating the two is what
 * took the supporter perks off every paying patron the first time this shipped
 * without its secrets. A misconfigured server told everyone they had never paid
 * and offered them the sign-in that was itself broken.
 *
 * `available: false` lets the client say "we cannot check right now" instead,
 * which is both true and something a patron can act on.
 */
const UNAVAILABLE = { isSupporter: false, personId: null, available: false };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const secret = env.PATREON_SESSION_SECRET;
  if (!secret) {
    console.error("[patreon] PATREON_SESSION_SECRET is not set — nobody can be verified.");
    return json(UNAVAILABLE);
  }

  const token = cookieFrom(request.headers.get("Cookie"), SESSION_COOKIE);
  const session = await readSession(token, secret);
  if (!session) return json(ANONYMOUS);

  return json({ isSupporter: session.isSupporter, personId: `patreon:${session.userId}` });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request }) => {
  const secure = new URL(request.url).protocol === "https:";
  return json(ANONYMOUS, { "Set-Cookie": clearedCookie(secure) });
};

function json(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      /* Never cached: a shared cache holding one visitor's answer and serving
         it to the next would hand out somebody else's supporter status. */
      "Cache-Control": "no-store, private",
      ...headers,
    },
  });
}
