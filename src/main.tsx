import { applyConsent, readConsent } from "./utils/consent";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
// Loaded after index.css so the restyle wins at equal specificity. Its own
// files are in cascade order too — see fixes/index.css.
import "./fixes/index.css";
import App from "./App";
import { GlobalProvider } from "./hooks/optionsContext";
import { Tour } from "./components/Tour";
import ErrorBoundary from "./components/ErrorBoundary";
import PlayerLinkProvider from "./components/PlayerLinkProvider";
import { installNumberFieldSelection } from "./utils/numberFields";
import { CampaignBadge } from "./components/CampaignBadge";
import { reloadOnCampaignSwitch } from "./utils/LocalStorage";

/* Every number field in the app opens with its number selected — see
   numberFields.ts. Installed once, for the life of the page. */
installNumberFieldSelection();

/* dmOS can switch campaign from another frame; the page follows by reloading,
   since everything it holds belongs to the old one. See utils/LocalStorage. */
reloadOnCampaignSwitch();

/* Analytics runs only for somebody who has said yes: posthog-js is not even
   downloaded before that, and in dev or without a key there is nothing to
   start. The stored answer is acted on at every load — see utils/consent.ts
   and startAnalytics in utils/telemetry. */
applyConsent(readConsent());


/* Outermost on purpose: a boundary only catches what is *below* it, and the
   providers are as capable of throwing as anything they wrap. Without one here
   React unmounts the whole tree and the DM gets a blank page mid-combat. */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary variant="page">
      <React.StrictMode>
        <GlobalProvider>
            <Tour />
            <CampaignBadge />
            <div id="page">
              {/* Sharing the battle with players — one room for the whole
                  app, so the tracker publishing and the Battle Manager's
                  share button are talking about the same one. */}
              <PlayerLinkProvider>
                <App />
              </PlayerLinkProvider>
            </div>
        </GlobalProvider>
      </React.StrictMode>
  </ErrorBoundary>
);
