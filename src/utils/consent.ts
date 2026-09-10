/**
 * Whether we are allowed to measure anything.
 *
 * A banner that does not actually gate capture is decoration, so this one does:
 * `posthog.init` runs with `opt_out_capturing_by_default`, and nothing at all
 * is sent until somebody says yes. Declining is a real answer that sticks.
 *
 * Be aware of the trade this makes. Consent means fewer numbers — every visitor
 * who ignores the bar is a visitor you cannot see, and on a small audience that
 * is most of them. `REQUIRE_CONSENT` below is the single switch: false goes back
 * to capturing by default with the banner offering a way out instead, which is
 * what a great many sites do and is not a defensible reading of the GDPR for
 * analytics that now carries a real Patreon user id.
 */

import posthog from "posthog-js";
import { ANALYTICS_ENABLED } from "./telemetry";

/**
 * Opt-in (true) or opt-out (false).
 *
 * Flipping this to false also means changing `opt_out_capturing_by_default` in
 * main.tsx — they are two halves of one decision, which is why the constant
 * lives here and the comment says so out loud.
 */
export const REQUIRE_CONSENT = true;

export type Consent = "granted" | "denied" | "unset";

const KEY = "analyticsConsent";

export function readConsent(): Consent {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "granted" || stored === "denied" ? stored : "unset";
  } catch {
    /* Private modes refuse storage. Treat that as undecided rather than as a
       yes — the one thing it must never do is silently grant. */
    return "unset";
  }
}

/**
 * Record a decision and act on it immediately.
 *
 * Opting out also wipes what posthog-js has already persisted about this
 * browser, so declining does not leave the previous id sitting in localStorage.
 */
export function setConsent(consent: Exclude<Consent, "unset">): void {
  try {
    window.localStorage.setItem(KEY, consent);
  } catch {
    /* If we cannot remember it, the bar comes back next visit. That is the
       right failure: it asks again rather than assuming. */
  }
  applyConsent(consent);
}

/** Push a decision into PostHog. Safe to call before init and in dev. */
export function applyConsent(consent: Consent): void {
  if (!ANALYTICS_ENABLED) return;
  try {
    if (consent === "granted") {
      posthog.opt_in_capturing();
    } else if (consent === "denied") {
      posthog.opt_out_capturing();
      /* Drops the stored distinct_id and person properties. Without this,
         declining stops new events but leaves the identifiers behind. */
      posthog.reset(true);
    }
  } catch {
    /* Analytics must never be the thing that breaks a page. */
  }
}

/** True when the bar should be on screen. */
export function needsDecision(): boolean {
  return REQUIRE_CONSENT && readConsent() === "unset";
}
