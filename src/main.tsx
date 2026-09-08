import { DEVMODE } from "./utils/devmode";
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
import { PlayerPage } from "./player/PlayerPage";

// Analytics only in real builds, and only when a key is configured — dev runs
// were previously firing events too (and being blocked by the old meta CSP).
if (!DEVMODE && import.meta.env.VITE_PUBLIC_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
  });
}


const root = ReactDOM.createRoot(document.getElementById("root")!);

/**
 * The player page is a different application that happens to share a bundle.
 *
 * Mounted here instead of inside <App /> so it gets none of it: no rosters, no
 * settings, no combat context, no managers, no Patreon overlay — and no read
 * of the DM's localStorage. The only thing it knows about the fight is what
 * the server hands it, which is the same guarantee the projection makes on the
 * other end.
 *
 * `_redirects` in public/ is what makes the server hand this path index.html
 * in the first place; there is no router in the app.
 */
const playerRoute = window.location.pathname.match(/^\/play\/([^/]+)\/?$/);

if (playerRoute) {
  root.render(
    <React.StrictMode>
      <PlayerPage code={decodeURIComponent(playerRoute[1])} />
    </React.StrictMode>
  );
} else {
  root.render(
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
  );
}
