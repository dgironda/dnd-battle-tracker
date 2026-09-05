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

// Analytics only in real builds, and only when a key is configured — dev runs
// were previously firing events too (and being blocked by the old meta CSP).
if (!DEVMODE && import.meta.env.VITE_PUBLIC_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
  });
}


ReactDOM.createRoot(document.getElementById("root")!).render(
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
