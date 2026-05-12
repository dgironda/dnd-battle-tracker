import React, { lazy, Suspense, useState, useEffect } from "react";
import BattleTracker from "./components/BattleTracker/BattleTracker";
import { CombatProvider } from "./components/BattleTracker/CombatContext";
import PatreonOverlay from "./components/PatreonOverlay";
import { DEVMODE } from "./utils/devmode";
import { useGlobalContext } from "./hooks/optionsContext";
import { Helmet } from "react-helmet-async";
import monsterShareURL from "./utils/monsterShareURL";
import { startTour } from "./components/Tour";
import BTLogo from "./assets/draftsvgs_v2/logo.svg";
import Backdrop from "./utils/backdrop";

const HeroManager = lazy(() => import("./components/HeroManager/HeroManager"));
const MonsterManager = lazy(() => import("./components/MonsterManager/MonsterManager"));
const BattleManager = lazy(() => import("./components/BattleManager/BattleManager"));
const AboutPanel = lazy(() => import("./components/AboutPanel"));
const OptionsPanel = lazy(() => import("./components/OptionsPanel"));

const ENABLE_PATREON = !DEVMODE;

function App() {
  const [showHeroManager, setShowHeroManager] = useState(false);
  const [showMonsterManager, setShowMonsterManager] = useState(false);
  const [openPanel, setOpenPanel] = useState<"hero" | "monster" | "battle" | "about" | "options" | null>(null);
  const { settings } = useGlobalContext();
  const handleClosePanel = () => setOpenPanel(null);
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);

  useEffect(() => {
    monsterShareURL.loadMonstersFromURL();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Manager Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "w":
          setOpenPanel(openPanel === "monster" ? null : "monster");
          break;
        case "e":
          setOpenPanel(openPanel === "hero" ? null : "hero");
          break;
        case "r":
          setOpenPanel(openPanel === "battle" ? null : "battle");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [openPanel]);

  // Patreon OAuth
  const [isSupporter, setIsSupporter] = useState(false);

  useEffect(() => {
    if (!ENABLE_PATREON) {
      setIsSupporter(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      localStorage.setItem("patreon_code", code);
      setIsSupporter(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (localStorage.getItem("patreon_code")) {
      setIsSupporter(true);
    }
  }, []);

  const [overlayVisible, setOverlayVisible] = useState(true);
  const [battleOverlayVisible, setBattleOverlayVisible] = useState(false);

  useEffect(() => {
    if (!ENABLE_PATREON) {
      setOverlayVisible(false);
      return;
    }

    const hasCode = localStorage.getItem("patreon_code");
    const urlCode = new URLSearchParams(window.location.search).get("code");

    if (hasCode || urlCode) {
      setOverlayVisible(false);
    }
  }, []);

  useEffect(() => {
    if (openPanel === "battle" && !isSupporter && ENABLE_PATREON) {
      setBattleOverlayVisible(true);
    }
  }, [openPanel, isSupporter]);

  const handlePatreonLogin = () => {
    const clientId = import.meta.env.VITE_PATREON_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_PATREON_REDIRECT_URI;
    const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  };

  return (
    <>
      <Helmet>
        <title>D&D Battle Tracker | Automated Combat and Initiative Management</title>
        <meta
          name="description"
          content="Keep your combat clean and simple with the D&D Battle Tracker. Featuring automatic turn advancement, integrated Hero/Monster managers, and instant condition reminders for faster gameplay"
        />
        <meta property="og:title" content="D&D Battle Tracker" />
        <meta property="og:description" content="Keep your combat clean and simple with the D&D Battle Tracker." />
        <meta name="keywords" content="D&D, 2014, 2024, 5e, initiative, battle, combat" />
        <meta property="og:url" content="http://battletracker.simulacrumtechnologies.com/" />
        <link rel="canonical" href="http://battletracker.simulacrumtechnologies.com/" />
        <meta property="og:type" content="application" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <meta name="author" content="Simulacrum Technologies" />
        <meta name="language" content="English" />
        <meta property="og:image" content="./src/assets/BattleTracker_v0.8.png" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; img-src 'self' data: *.patreon.com; script-src 'self' *.patreon.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; frame-src *.patreon.com;"
        />
        <meta httpEquiv="Referrer-Policy" content="no-referrer" />
        <meta httpEquiv="Permissions-Policy" content="geolocation=(self), microphone='none'" />
      </Helmet>
      <CombatProvider>
        {overlayVisible && (
          <PatreonOverlay
            onClose={() => {
              setOverlayVisible(false);
            }}
          />
        )}

        {battleOverlayVisible && (
          <PatreonOverlay
            onClose={() => {
              setBattleOverlayVisible(false);
              setOpenPanel(null);
            }}
          />
        )}

        <div id="header">
          <img id="logo" src={BTLogo} alt="D&D Battle Tracker" />
          <button
            id="aboutButton"
            title="Instructions and credits"
            onClick={() => setOpenPanel(openPanel === "about" ? null : "about")}
          >
            {openPanel === "about" ? "" : ""}
          </button>
          {openPanel === "about" && (
            <Suspense fallback={null}>
              <AboutPanel onClose={handleClosePanel} />
            </Suspense>
          )}
          <Backdrop isOpen={openPanel !== null} onClick={handleClosePanel} />
          <button
            id="heroManagerButton"
            title="Add, Update, and Delete Heroes"
            onClick={() => setOpenPanel(openPanel === "hero" ? null : "hero")}
          >
            {openPanel === "hero" ? <span></span> : <span></span>}
          </button>
          {openPanel === "hero" && (
            <Suspense fallback={null}>
              <HeroManager onClose={handleClosePanel} />
            </Suspense>
          )}

          <button
            id="monsterManagerButton"
            title="Add, Update, and Delete Monsters"
            onClick={() => setOpenPanel(openPanel === "monster" ? null : "monster")}
          >
            {openPanel === "monster" ? <span></span> : <span></span>}
          </button>
          {openPanel === "monster" && (
            <Suspense fallback={null}>
              <MonsterManager onClose={handleClosePanel} />
            </Suspense>
          )}

          <button
            id="battleManagerButton"
            title="Save and Load Battles"
            onClick={() => setOpenPanel(openPanel === "battle" ? null : "battle")}
          >
            {openPanel === "battle" ? <span></span> : <span></span>}
          </button>
          {openPanel === "battle" && (
            <Suspense fallback={null}>
              <BattleManager onClose={handleClosePanel} />
            </Suspense>
          )}

          <button
            id="optionsButton"
            title="Options and settings"
            onClick={() => setOpenPanel(openPanel === "options" ? null : "options")}
          >
            {openPanel === "options" ? "" : ""}
          </button>
          {openPanel === "options" && (
            <Suspense fallback={null}>
              <OptionsPanel onClose={handleClosePanel} isSupporter={isSupporter} />
            </Suspense>
          )}

          {settings.tourReady && !isPortrait && (
            <>
              <button
                id="buttonStartTour"
                onClick={() => {
                  startTour();
                  handleClosePanel();
                }}
              >
                Start Tour
              </button>
            </>
          )}

          <div id="patreonLink">
            {!isSupporter ? (
              <button onClick={handlePatreonLogin}>Support us on Patreon!</button>
            ) : (
              <div>
                <p>✅ Thank you for your support!</p>{" "}
                <p>
                  Don&apos;t forget to join our{" "}
                  <a href="https://discord.gg/m4AnYSDueM" target="_blank" rel="noreferrer">
                    Discord Community
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>

        <BattleTracker setShowHeroManager={setShowHeroManager} setShowMonsterManager={setShowMonsterManager} />
        <div id="footer">
          ©2026{" "}
          <a href="https://www.simulacrumtechnologies.com" target="_blank" rel="noreferrer">
            Simulacrum Technologies
          </a>
          . All rights reserved. Website design and content are protected by copyright law. Built by DMs, for DMs.
          <p>
            Join our{" "}
            <a href="https://discord.gg/m4AnYSDueM" target="_blank" rel="noreferrer">
              Discord server
            </a>{" "}
            for updates and to provide feedback.
          </p>
        </div>
      </CombatProvider>
    </>
  );
}

export default App;
