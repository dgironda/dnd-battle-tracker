import React from "react";
import ReactDOM from "react-dom/client";
<<<<<<< HEAD
import "./index.css";
import App from "./App";
import { GlobalProvider } from "./hooks/versionContext";
=======
import BattleTracker from "./components/BattleTracker/BattleTracker";
import "./index.css";
import App from "./App";
>>>>>>> 3757b41 (reorg is up and functional)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GlobalProvider>
  <React.StrictMode>
<<<<<<< HEAD
    {/* <div id="header">
      <About /><ToggleComponent />
    </div> */}
    <App />
=======
    <App />
    <BattleTracker />
>>>>>>> 3757b41 (reorg is up and functional)
  </React.StrictMode>
  </GlobalProvider>
);
