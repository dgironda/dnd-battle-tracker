import { ANALYTICS_ENABLED, scrubSecrets } from "./utils/telemetry";
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
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
    /* Nothing leaves without going past this. See scrubSecrets. */
    before_send: (event) => {
      if (!event?.properties) return event;
      for (const [key, value] of Object.entries(event.properties)) {
        if (typeof value === 'string') event.properties[key] = scrubSecrets(value);
      }
      return event;
    },
  });
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
