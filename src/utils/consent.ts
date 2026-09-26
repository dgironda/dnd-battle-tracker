/**
 * Whether we are allowed to measure anything.
 *
 * A banner that does not actually gate capture is decoration, so this one does:
 * posthog-js is not even downloaded until somebody says yes (startAnalytics in
 * utils/telemetry), so nothing at all goes to PostHog before then. Declining is
 * a real answer that sticks.
 *
 * Be aware of the trade this makes. Consent means fewer numbers — every visitor
 * who ignores the bar is a visitor you cannot see, and on a small audience that
 * is most of them. `REQUIRE_CONSENT` below is the single switch: false goes back
 * to capturing by default with the banner offering a way out instead, which is
 * what a great many sites do and is not a defensible reading of the GDPR for
 * analytics that now carries a real Patreon user id.
 */

import { ANALYTICS_ENABLED, resetIdentity, startAnalytics, stopAnalytics } from "./telemetry";

/** Opt-in (true) or opt-out (false). The whole decision is made in applyConsent. */
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

/**
 * Act on an answer: start analytics for a yes, stop it (and clear what it kept)
 * for a no. Runs on every page load with the stored answer, so somebody who
 * accepted last week is measured again and somebody who declined stays out.
 * Safe to call in dev, where there is nothing to start.
 */
export function applyConsent(consent: Consent): void {
  if (!ANALYTICS_ENABLED) return;
  const allowed = consent === "granted" || (consent === "unset" && !REQUIRE_CONSENT);
  if (allowed) void startAnalytics();
  else stopAnalytics();
}

/**
 * Forget who this browser was identified as — for a Patreon sign-out — without
 * forgetting what it said about analytics.
 *
 * posthog-js's `reset()` wipes its own stored consent along with the identity,
 * which would quietly switch capturing off for somebody who said yes. So the
 * answer kept here is put straight back.
 */
export function forgetIdentity(): void {
  if (!ANALYTICS_ENABLED) return;
  resetIdentity();
  applyConsent(readConsent());
}

/** True when the bar should be on screen. */
export function needsDecision(): boolean {
  return REQUIRE_CONSENT && readConsent() === "unset";
}
