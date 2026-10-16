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
export function patreonAuthorizeUrl(state: string): string {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: import.meta.env.VITE_PATREON_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_PATREON_REDIRECT_URI,
    scope: "identity identity.memberships",
    state,
  });
  /* URLSearchParams writes a space as "+", which is correct for form encoding
     and not universally accepted in an OAuth `scope`. "%20" is accepted
     everywhere, so the separator is normalised rather than left to chance. */
  return `https://www.patreon.com/oauth2/authorize?${query.toString().replace(/\+/g, "%20")}`;
}

/** Where a sign-in keeps its one-time state while this tab is away at Patreon. */
const SIGN_IN_STATE = "patreonSignInState";

/**
 * Send this tab to Patreon to sign in.
 *
 * With a one-time `state`, which Patreon hands straight back on the redirect
 * and which is remembered in this tab's sessionStorage until then. Without it
 * the page traded in any `?code=` it landed on — so anybody could send a link
 * carrying the code from THEIR sign-in, and whoever opened it would be signed
 * in as them (a login CSRF). Now only the answer to a sign-in this tab started
 * is used. See takeReturnedCode.
 */
export function beginPatreonSignIn(): void {
  window.location.href = newSignInUrl();
}

/** The authorize link for a new sign-in, its state remembered for the return. */
export function newSignInUrl(): string {
  return patreonAuthorizeUrl(rememberSignInState());
}

function rememberSignInState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    window.sessionStorage.setItem(SIGN_IN_STATE, state);
  } catch {
    /* Storage refused. The return then matches nothing and is turned away,
       which is the safe way for this to fail. */
  }
  return state;
}

/**
 * The code Patreon sent back — but only if it answers the sign-in this tab
 * started, i.e. its `state` is the one beginPatreonSignIn remembered.
 *
 * Single use: the remembered state is dropped whether it matched or not, so a
 * reload of the redirect cannot trade the same answer in twice.
 */
export function takeReturnedCode(params: URLSearchParams): string | null {
  const code = params.get("code");
  const state = params.get("state");
  let expected: string | null = null;
  try {
    expected = window.sessionStorage.getItem(SIGN_IN_STATE);
    window.sessionStorage.removeItem(SIGN_IN_STATE);
  } catch {
    /* Nothing remembered means nothing matches. */
  }
  if (!code || !state || !expected || state !== expected) return null;
  return code;
}

/**
 * What to put in front of somebody once the server has answered.
 *
 * - `"invite"` — the Support-us prompt, for anyone who is not a supporter.
 * - `"no-pledge"` — for a sign-in that has JUST come back without a pledge.
 *   This used to be the invite again, and the invite's button is the sign-in,
 *   and Patreon waves an account it has already authorised straight back: sign
 *   in, "support us", sign in, "support us", with nothing to say why. Now the
 *   visitor is told the sign-in worked and what it found.
 * - `"none"` — a supporter, or a server that could not answer. Offering sign-in
 *   to somebody whose sign-in is the broken thing helps nobody.
 */
export type SupporterPrompt = "invite" | "no-pledge" | "none";

export function supporterPrompt(state: SupporterState, justSignedIn: boolean): SupporterPrompt {
  if (!state.available || state.isSupporter) return "none";
  if (justSignedIn && state.personId !== null) return "no-pledge";
  return "invite";
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
