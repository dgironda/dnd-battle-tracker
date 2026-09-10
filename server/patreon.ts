/**
 * The Patreon exchange, and the session it produces.
 *
 * This is the half of the supporter gate that cannot live in the browser. The
 * OAuth code the redirect hands back is worth nothing on its own — turning it
 * into a token needs the client *secret*, and a secret in a Vite bundle is not
 * a secret. So the exchange happens in a Pages Function and this module holds
 * the parts both of its routes need.
 *
 * What changed, and why it matters: the gate used to be `localStorage.getItem
 * ("patreon_code") !== null`, which anyone could satisfy from the console in
 * about four seconds. Now the browser holds a signed, expiring session cookie
 * it cannot forge and cannot read, and every answer about supporter status
 * comes from verifying that signature server-side.
 *
 * Deliberately NOT stored anywhere: the access token and the refresh token.
 * They are used once, inside the exchange, to ask Patreon who this is, and then
 * dropped. Keeping them would mean holding credentials that can act on someone's
 * Patreon account, to power a supporter badge and an analytics id.
 */

/** How long a supporter stays signed in before re-authorising. */
const SESSION_DAYS = 30;

export const SESSION_COOKIE = "bt_supporter";

export interface PatreonSession {
  /** Patreon's own numeric user id. */
  userId: string;
  isSupporter: boolean;
  /** Expiry, epoch seconds. */
  exp: number;
}

export interface PatreonEnv {
  PATREON_CLIENT_ID?: string;
  PATREON_CLIENT_SECRET?: string;
  PATREON_REDIRECT_URI?: string;
  /** Signs the session cookie. Any long random string; not a Patreon value. */
  PATREON_SESSION_SECRET?: string;
  /**
   * Optional. With it, only a patron of THIS campaign counts; without it, an
   * active membership to any campaign does. Set it if you can — otherwise
   * somebody who supports an unrelated creator reads as a supporter here.
   */
  PATREON_CAMPAIGN_ID?: string;
  /* The build-time client vars are the same values, so they are accepted as a
     fallback: a Pages project that already has them set does not need them
     entered twice. The secret is never among these — it has no VITE_ twin and
     must not acquire one. */
  VITE_PATREON_CLIENT_ID?: string;
  VITE_PATREON_REDIRECT_URI?: string;
}

export function clientId(env: PatreonEnv): string | undefined {
  return env.PATREON_CLIENT_ID ?? env.VITE_PATREON_CLIENT_ID;
}

export function redirectUri(env: PatreonEnv): string | undefined {
  return env.PATREON_REDIRECT_URI ?? env.VITE_PATREON_REDIRECT_URI;
}

/* ------------------------------------------------------------------------ */
/* Signing                                                                   */
/* ------------------------------------------------------------------------ */

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** `<payload>.<signature>`, both base64url. */
export async function signSession(session: PatreonSession, secret: string): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

/**
 * Check a cookie and give back what it says, or null.
 *
 * Verification uses `crypto.subtle.verify` rather than re-signing and comparing
 * strings, because a `===` on two signatures leaks timing. Expiry is checked
 * after the signature, so an expired-but-valid session and a forged one are
 * indistinguishable from the outside.
 */
export async function readSession(
  token: string | undefined,
  secret: string,
): Promise<PatreonSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      fromBase64url(signature),
      encoder.encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const session = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as PatreonSession;
    if (typeof session.exp !== "number" || session.exp * 1000 < Date.now()) return null;
    if (typeof session.userId !== "string" || !session.userId) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    /* Lax, not Strict: the Patreon redirect is a top-level cross-site
       navigation back to us, and Strict would withhold the cookie on it. */
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearedCookie(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function cookieFrom(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

export function expiry(): number {
  return Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
}

/* ------------------------------------------------------------------------ */
/* Patreon                                                                   */
/* ------------------------------------------------------------------------ */

const TOKEN_URL = "https://www.patreon.com/api/oauth2/token";
const IDENTITY_URL =
  "https://www.patreon.com/api/oauth2/v2/identity" +
  "?include=memberships,memberships.campaign" +
  "&fields%5Bmember%5D=patron_status" +
  "&fields%5Buser%5D=full_name";

interface IdentityResponse {
  data?: { id?: string };
  included?: {
    type?: string;
    attributes?: { patron_status?: string };
    relationships?: { campaign?: { data?: { id?: string } } };
  }[];
}

export class PatreonError extends Error {
  /* Written out rather than as a constructor parameter property: the project
     builds with `erasableSyntaxOnly`, which forbids the shorthand because it
     emits real code rather than being a type annotation that vanishes. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PatreonError";
    this.status = status;
  }
}

/**
 * Turn the redirect's code into "who is this, and are they a patron".
 *
 * The token never leaves this function. Patreon is asked once, immediately,
 * and what comes back out is an id and a boolean.
 */
export async function exchangeCode(code: string, env: PatreonEnv): Promise<PatreonSession> {
  const id = clientId(env);
  const secret = env.PATREON_CLIENT_SECRET;
  const redirect = redirectUri(env);

  if (!id || !secret || !redirect) {
    /* A configuration fault, not the visitor's. Says which piece is missing in
       the server log and nothing specific to the client. */
    console.error("[patreon] missing config:", {
      clientId: !!id,
      clientSecret: !!secret,
      redirectUri: !!redirect,
    });
    throw new PatreonError("Patreon sign-in is not configured.", 500);
  }

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: id,
      client_secret: secret,
      redirect_uri: redirect,
    }),
  });

  if (!tokenResponse.ok) {
    /* The body can echo the code back; log the status alone. */
    console.error("[patreon] token exchange failed:", tokenResponse.status);
    throw new PatreonError("Patreon would not accept that sign-in. Try again.", 502);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as {
    access_token?: string;
  };
  if (!accessToken) throw new PatreonError("Patreon returned no access token.", 502);

  const identityResponse = await fetch(IDENTITY_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!identityResponse.ok) {
    console.error("[patreon] identity lookup failed:", identityResponse.status);
    throw new PatreonError("Could not read your Patreon account.", 502);
  }

  const identity = (await identityResponse.json()) as IdentityResponse;
  const userId = identity.data?.id;
  if (!userId) throw new PatreonError("Patreon returned no user id.", 502);

  return { userId, isSupporter: isActivePatron(identity, env.PATREON_CAMPAIGN_ID), exp: expiry() };
}

/**
 * Whether any of the memberships is an active pledge to us.
 *
 * Without a campaign id configured this can only ask "a patron of anything?",
 * which is a weaker test than it looks — it would let somebody who supports an
 * unrelated creator through. Hence the warning rather than a silent pass.
 */
export function isActivePatron(identity: IdentityResponse, campaignId?: string): boolean {
  const members = (identity.included ?? []).filter((entry) => entry.type === "member");
  if (!campaignId) {
    console.warn("[patreon] PATREON_CAMPAIGN_ID is not set — accepting any active membership.");
  }
  return members.some((member) => {
    if (member.attributes?.patron_status !== "active_patron") return false;
    if (!campaignId) return true;
    return member.relationships?.campaign?.data?.id === campaignId;
  });
}
