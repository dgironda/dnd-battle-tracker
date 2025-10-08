import React from "react";
import ReactDOM from "react-dom/client";
import BattleTracker from "./components/BattleTracker/BattleTracker";
import "./index.css";
import App from "./App";
import { About } from "./About";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <About />
    <App />
  </React.StrictMode>
);
