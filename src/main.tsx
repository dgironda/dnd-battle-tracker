import { ANALYTICS_ENABLED, scrubSecrets } from "./utils/telemetry";
import { applyConsent, readConsent, REQUIRE_CONSENT } from "./utils/consent";
import { HelmetProvider } from "react-helmet-async";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
// Loaded after index.css so the review fixes win at equal specificity.
import "./fixes.css";
import App from "./App";
import { GlobalProvider } from "./hooks/optionsContext";
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { Tour } from "./components/Tour";
import ErrorBoundary from "./components/ErrorBoundary";

// Analytics only in real builds, and only when a key is configured — dev runs
// were previously firing events too (and being blocked by the old meta CSP).
// The flag is shared with utils/telemetry so the two cannot disagree about
// whether the client was ever initialised.
if (ANALYTICS_ENABLED) {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    /* Our own origin, not us.i.posthog.com — see functions/relay/[[path]].ts.
       PostHog's hostnames are on every mainstream blocklist, so a real share of
       events never left the browser and the numbers under-reported. */
    api_host: '/relay',
    /* Where the toolbar and "view in PostHog" links point. It is the app URL,
       which is NOT the ingestion host in VITE_PUBLIC_POSTHOG_HOST: with only a
       relative api_host set, those links would resolve against our own domain
       and 404. */
    ui_host: 'https://us.posthog.com',
    defaults: '2025-05-24',
    /* Nothing is captured until somebody says yes — see utils/consent.ts.
       This is the half of the cookie bar that makes it more than decoration,
       and the two are one decision: flipping REQUIRE_CONSENT means flipping
       this with it. */
    opt_out_capturing_by_default: REQUIRE_CONSENT,
    /* Nothing leaves without going past this. See scrubSecrets. */
    before_send: (event) => {
      if (!event?.properties) return event;
      for (const [key, value] of Object.entries(event.properties)) {
        if (typeof value === 'string') event.properties[key] = scrubSecrets(value);
      }
      return event;
    },
  });

  /* A console handle, on purpose.
     We import posthog as an ES module, so unlike the old script-snippet install
     it never lands on `window` — which means there is no way to run
     `posthog.opt_out_capturing()` or `posthog.identify(...)` on the live site,
     and no way to check from the console whether analytics is even alive. That
     cost an hour of wrongly concluding nothing was being collected.

     It grants nobody anything new: the project key ships in this bundle already
     and is designed to be public, so anything reachable through this handle was
     reachable without it. */
  (window as unknown as { posthog: typeof posthog }).posthog = posthog;

  /* Re-apply the stored answer on every load. `opt_out_capturing_by_default`
     only covers a browser that has never decided; somebody who accepted last
     week has to be opted back in, and somebody who declined stays out even if
     that default is ever changed. */
  applyConsent(readConsent());
}


/* Outermost on purpose: a boundary only catches what is *below* it, and the
   providers are as capable of throwing as anything they wrap. Without one here
   React unmounts the whole tree and the DM gets a blank page mid-combat. */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary variant="page">
    <HelmetProvider>
      <React.StrictMode>
        <GlobalProvider>
          <PostHogProvider client={posthog}>
            <Tour />
            <div id="page">
              <App />
            </div>
          </PostHogProvider>
        </GlobalProvider>
      </React.StrictMode>
    </HelmetProvider>
  </ErrorBoundary>
);
