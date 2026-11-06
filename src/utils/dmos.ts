/**
 * dmOS: the desktop of DM tools that embeds BattleTracker and talks to it
 * through bridge.html. Which sites count as dmOS, and the Patreon sign-in it
 * borrows from here.
 *
 * dmOS is for patrons. Its "Sign in with Patreon" can't happen on dmOS itself:
 * the Patreon app's redirect is BattleTracker's, and so is the session cookie
 * the bridge checks. So dmOS sends the tab here with `?signin=dmos&return=
 * <its origin>`, the usual sign-in runs, and the tab goes back to dmOS.
 */

const DMOS_ORIGINS = ["https://dmos.simulacrumtechnologies.com"];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Whether this page is BattleTracker running in a dmOS window.
 *
 * Being framed at all says so: BattleTracker's headers let only dmOS frame it
 * (frame-ancestors in public/_headers). `?host=dmos` says the same on purpose,
 * to see the dmOS layout in an ordinary tab.
 */
export function inDmos(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("host") === "dmos") return true;
    return window.self !== window.top;
  } catch {
    /* A page the browser won't even let compare itself with the top window
       is a framed one. */
    return true;
  }
}

/** Only dmOS may ask; any local origin may too while developing. */
export function isAllowedOrigin(origin: string, dev: boolean): boolean {
  return DMOS_ORIGINS.includes(origin) || (dev && LOCAL_ORIGIN.test(origin));
}

/**
 * Sheets borrows the sign-in too, for patrons' characters to follow their
 * login, but only to come back to: it never talks to the bridge.
 */
const SHEETS_ORIGINS = ["https://sheets.simulacrumtechnologies.com"];

/** Where a borrowed sign-in may send the tab back to: dmOS, or Sheets. */
export function isSignInReturn(origin: string, dev: boolean): boolean {
  return isAllowedOrigin(origin, dev) || SHEETS_ORIGINS.includes(origin);
}

/** Where a sign-in dmOS started keeps its way home while the tab is at Patreon. */
const RETURN_KEY = "dmosSignInReturn";

/**
 * Whether this page load is dmOS asking for a sign-in. If so, remember where
 * to send the tab back. Only dmOS's own origins are accepted, so the page
 * can't be used to bounce somebody to any other site.
 */
export function rememberDmosReturn(params: URLSearchParams, dev: boolean): boolean {
  if (params.get("signin") !== "dmos") return false;
  const to = params.get("return") ?? "";
  if (!isSignInReturn(to, dev)) return false;
  try {
    sessionStorage.setItem(RETURN_KEY, to);
    return true;
  } catch {
    return false;
  }
}

/** Where to send the tab once a sign-in dmOS started is over, or null. Single use. */
export function takeDmosReturn(dev: boolean): string | null {
  try {
    const to = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return to && isSignInReturn(to, dev) ? to : null;
  } catch {
    return null;
  }
}
