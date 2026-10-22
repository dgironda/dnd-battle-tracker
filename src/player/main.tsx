import React from "react";
import ReactDOM from "react-dom/client";
import { PlayerPage } from "./PlayerPage";
import "./player.css";

/**
 * The player page's own entry (play.html).
 *
 * `/play/<code>` is served this page by public/_redirects in production and by
 * the player-route plugin in vite.config.ts in development, so the code is read
 * straight from the path; there is no router.
 */
const match = window.location.pathname.match(/^\/play\/([^/]+)\/?$/);
const code = match ? decodeURIComponent(match[1]) : null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PlayerPage code={code} />
  </React.StrictMode>,
);
