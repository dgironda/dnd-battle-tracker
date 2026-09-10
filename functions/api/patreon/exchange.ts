/**
 * POST /api/patreon/exchange   { code } → { isSupporter, personId }
 *
 * The redirect lands the browser back here with `?code=…`. The browser posts
 * that code to this route and gets back a signed, httpOnly session cookie plus
 * the two facts it is allowed to know. The code, the access token and the
 * refresh token never travel any further than this function.
 */

import {
  exchangeCode,
  PatreonError,
  sessionCookie,
  signSession,
  type PatreonEnv,
} from "../../../server/patreon";

interface Env extends PatreonEnv {
  PATREON_SESSION_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = env.PATREON_SESSION_SECRET;
  if (!secret) {
    console.error("[patreon] PATREON_SESSION_SECRET is not set — cannot sign a session.");
    return json({ error: "Patreon sign-in is not configured." }, 500);
  }

  let code: unknown;
  try {
    ({ code } = (await request.json()) as { code?: unknown });
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }
  if (typeof code !== "string" || !code.trim()) {
    return json({ error: "No code supplied." }, 400);
  }

  let session;
  try {
    session = await exchangeCode(code.trim(), env);
  } catch (error) {
    if (error instanceof PatreonError) return json({ error: error.message }, error.status);
    console.error("[patreon] unexpected exchange failure:", error);
    return json({ error: "Could not reach Patreon." }, 502);
  }

  const token = await signSession(session, secret);
  const secure = new URL(request.url).protocol === "https:";

  return json(
    {
      isSupporter: session.isSupporter,
      /* The raw Patreon user id, prefixed so it reads as what it is wherever it
         turns up. This becomes the person id in PostHog. */
      personId: `patreon:${session.userId}`,
    },
    200,
    { "Set-Cookie": sessionCookie(token, secure) },
  );
};

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      /* A session answer must never be held by a cache, ours or a proxy's. */
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
