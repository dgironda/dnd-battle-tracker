/**
 * Asking the server who you are.
 *
 * The browser used to decide this for itself — `localStorage.getItem
 * ("patreon_code")` was the whole gate, and anyone could satisfy it from the
 * console. Now supporter status is a signed httpOnly cookie the browser can
 * neither read nor forge, and these three calls are the only way to learn
 * anything about it.
 *
 * Every failure resolves to "not a supporter" rather than throwing. A DM whose
 * wifi dropped should see the tracker with ads on it, not a crash card.
 */

import { DEVMODE } from "./devmode";

export interface SupporterState {
  isSupporter: boolean;
  /** `patreon:<id>`, or null when signed out. Becomes the PostHog person id. */
  personId: string | null;
  /**
   * Whether the server could answer at all.
   *
   * False means misconfigured or unreachable — which is emphatically NOT the
   * same as "not a supporter", and treating them as one is what silently
   * stripped the perks from every paying patron the first time this deployed
   * without its secrets. A patron in that state gets told, rather than being
   * shown a sign-in button that cannot work.
   */
  available: boolean;
}

const ANONYMOUS: SupporterState = { isSupporter: false, personId: null, available: true };

/** Reached nobody. Same shape as a configured server saying "cannot check". */
const UNREACHABLE: SupporterState = { isSupporter: false, personId: null, available: false };

/**
 * Dev builds have no Pages Functions in front of them and no Patreon app to
 * talk to, so the old behaviour stands: everything unlocked, nobody identified.
 */
const OFFLINE: SupporterState = { isSupporter: true, personId: null, available: true };

async function readJson(response: Response): Promise<SupporterState> {
  /* A 5xx is the server failing, not the visitor being a stranger. */
  if (!response.ok) return response.status >= 500 ? UNREACHABLE : ANONYMOUS;
  try {
    const body = (await response.json()) as Partial<SupporterState>;
    return {
      isSupporter: body.isSupporter === true,
      personId: typeof body.personId === "string" ? body.personId : null,
      /* Absent means an older deployment that predates this field, and those
         were answering the question properly — so absence is "available". */
      available: body.available !== false,
    };
  } catch {
    return ANONYMOUS;
  }
}

/**
 * Where "Support us on Patreon" sends you.
 *
 * Built here rather than in each component because there were two copies of it
 * and both were wrong in the same two ways.
 *
 * **`scope` was missing entirely**, and that is the one that would have wasted
 * an afternoon: without it Patreon issues a token with no permissions, so
 * `/v2/identity?include=memberships` comes back with no memberships and every
 * real patron is read as "not a supporter". Sign-in appears to work and the
 * perks never arrive. `identity` is who they are, `identity.memberships` is
 * what they pledge — both are needed, space-separated.
 *
 * **The redirect was interpolated raw** into the query string. It survived
 * because Patreon is lenient about it, but the token exchange requires the
 * redirect to match the authorize request *exactly*, and hand-built query
 * strings are exactly where that stops being true. URLSearchParams encodes it.
 */
export function patreonAuthorizeUrl(): string {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: import.meta.env.VITE_PATREON_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_PATREON_REDIRECT_URI,
    scope: "identity identity.memberships",
  });
  /* URLSearchParams writes a space as "+", which is correct for form encoding
     and not universally accepted in an OAuth `scope`. "%20" is accepted
     everywhere, so the separator is normalised rather than left to chance. */
  return `https://www.patreon.com/oauth2/authorize?${query.toString().replace(/\+/g, "%20")}`;
}

/** What the server currently says about this browser. */
export async function fetchSupporterState(): Promise<SupporterState> {
  if (DEVMODE) return OFFLINE;
  try {
    return await readJson(
      await fetch("/api/patreon/session", { credentials: "same-origin" }),
    );
  } catch {
    return UNREACHABLE;
  }
}

/**
 * Turn the redirect's `?code=` into a session.
 *
 * The code goes straight out again and is never stored. That is the point: it
 * is a credential, it is single-use, and the only thing that should ever hold
 * it is the function that exchanges it.
 */
export async function exchangeCode(code: string): Promise<SupporterState> {
  if (DEVMODE) return OFFLINE;
  try {
    return await readJson(
      await fetch("/api/patreon/exchange", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }),
    );
  } catch {
    return UNREACHABLE;
  }
}

export async function signOut(): Promise<SupporterState> {
  if (DEVMODE) return OFFLINE;
  try {
    await fetch("/api/patreon/session", { method: "DELETE", credentials: "same-origin" });
  } catch {
    /* The cookie expires on its own; a failed sign-out is not worth a message. */
  }
  return ANONYMOUS;
}

/**
 * Clear the key the old client-side gate used.
 *
 * It is now meaningless — nothing reads it — but it is a raw OAuth code sitting
 * in localStorage on every existing supporter's machine, so it should not just
 * be abandoned in place.
 */
export function forgetLegacyCode(): void {
  try {
    window.localStorage.removeItem("patreon_code");
  } catch {
    /* Storage can be refused; nothing here is worth failing over. */
  }
}
