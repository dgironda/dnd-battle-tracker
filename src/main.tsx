import { DEVMODE } from "./utils/devmode";

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { GlobalProvider } from "./hooks/versionContext";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2025-05-24',
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GlobalProvider>
  <React.StrictMode>
    {/* <div id="header">
      <About /><ToggleComponent />
    </div> */}
    <PostHogProvider client={posthog}>
      <div id="page">
        <App />
      </div>
    </PostHogProvider>

  </React.StrictMode>
  </GlobalProvider>
);
