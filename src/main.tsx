import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { GlobalProvider } from "./hooks/versionContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GlobalProvider>
  <React.StrictMode>
    {/* <div id="header">
      <About /><ToggleComponent />
    </div> */}
    <App />
  </React.StrictMode>
  </GlobalProvider>
);
