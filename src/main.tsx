import React from "react";
import ReactDOM from "react-dom/client";
import BattleTracker from "./components/BattleTracker/BattleTracker";
import "./index.css";
import App from "./App";
import { About } from "./About";
import ToggleComponent from "./components/ToggleContext";
import { GlobalProvider } from "./hooks/versionContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GlobalProvider>
  <React.StrictMode>
    <div id="header">
      <About /><ToggleComponent />
    </div>
    <App />
  </React.StrictMode>
  </GlobalProvider>
);
