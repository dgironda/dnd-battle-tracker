import { Fragment, lazy, Suspense, useCallback, useState, useEffect, type ReactNode } from "react";
import BattleTracker from "./components/BattleTracker/BattleTracker";
import { CombatProvider } from "./components/BattleTracker/CombatContext";
import { RosterProvider } from "./hooks/rosterContext";
import PatreonOverlay from "./components/PatreonOverlay";
import { DEVMODE, TOUR_ENABLED } from "./utils/devmode";
import { DISCORD_URL } from "./utils/links";
import AdSlot from "./components/AdSlot";
import { useGlobalContext } from "./hooks/optionsContext";
import { Helmet } from "react-helmet-async";
import monsterShareURL from "./utils/monsterShareURL";
import { startTour } from "./components/Tour";
import { DialogHost } from "./utils/notify";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalErrorNotice from "./components/GlobalErrorNotice";
import { clearCrashCount } from "./utils/crashRecovery";
import { identifyPerson, registerContext, setPerson, track } from "./utils/telemetry";
import {
  exchangeCode,
  fetchSupporterState,
  forgetLegacyCode,
} from "./utils/patreonSession";
import ConsentBanner from "./components/ConsentBanner";
import BTLogo from "./assets/draftsvgs_v2/logo.svg";
import Backdrop from "./utils/backdrop";

const HeroManager = lazy(() => import("./components/HeroManager/HeroManager"));
const MonsterManager = lazy(() => import("./components/MonsterManager/MonsterManager"));
const BattleManager = lazy(() => import("./components/BattleManager/BattleManager"));
const AboutPanel = lazy(() => import("./components/AboutPanel"));
const OptionsPanel = lazy(() => import("./components/OptionsPanel"));

const ENABLE_PATREON = !DEVMODE;

type PanelName = "hero" | "monster" | "battle" | "about" | "options";

/**
 * The header buttons carry their label in a background image, so each one needs
 * an explicit accessible name — without it a screen reader announces "button"
 * and voice control has nothing to match on.
 */
const PANEL_BUTTONS: {
  panel: PanelName;
  id: string;
  label: string;
  title: string;
  /* The keyboard shortcut, shown on the button the way v.0.3.1 did — the SVG
     art carries the name but had no room for the hint, so it was lost. */
  key?: string;
}[] = [
  { panel: "about", id: "aboutButton", label: "About and instructions", title: "Instructions and credits" },
  { panel: "hero", id: "heroManagerButton", label: "Hero Manager", title: "Add, Update, and Delete Heroes", key: "w" },
  { panel: "monster", id: "monsterManagerButton", label: "Monster Manager", title: "Add, Update, and Delete Monsters", key: "e" },
  { panel: "battle", id: "battleManagerButton", label: "Battle Manager", title: "Save and Load Battles", key: "r" },
  { panel: "options", id: "optionsButton", label: "Options", title: "Options and settings" },
];

function App() {
  const [openPanel, setOpenPanel] = useState<PanelName | null>(null);
  /* Portrait only, and it has no effect anywhere else: the button is
     `display: none` outside the card layout. The collapse itself is pure CSS —
     `#page:has(#mastheadToggle[aria-expanded="false"])` — so this state does
     not have to be threaded up to #page, which is rendered in main.tsx. */
  const [mastheadOpen, setMastheadOpen] = useState(true);
  const { settings } = useGlobalContext();
  const handleClosePanel = () => setOpenPanel(null);
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);

  /* Memoised on `openPanel` because it now reads it: the keyboard shortcuts
     effect below closes over this, and a stale copy would report a panel as
     opened every time its key was pressed, including to close it. */
  const togglePanel = useCallback(
    (panel: PanelName) => {
      /* Outside the updater, not inside it: StrictMode runs updaters twice and
         every event would be counted twice. Opening only — a close says nothing
         about what the panel is worth. */
      if (openPanel !== panel) track("panel_opened", { panel });
      setOpenPanel((prev) => (prev === panel ? null : panel));
    },
    [openPanel]
  );

  useEffect(() => {
    monsterShareURL.loadMonstersFromURL();
  }, []);

  /* Getting this far means the app drew itself, so whatever crashed a previous
     load is not crashing this one. Forgetting the count keeps the "clear the
     current fight" escape hatch out of sight until reloading really has stopped
     helping. */
  useEffect(() => {
    clearCrashCount();
  }, []);

  /* Registered as super properties rather than sent per event, so "does anyone
     actually run a fight from a phone?" can be asked of every other event and
     not just its own. Re-registered when the paper changes, which is rare. */
  useEffect(() => {
    registerContext({
      orientation: isPortrait ? "portrait" : "landscape",
      wallpaper: settings.wallpaper,
      theme: settings.theme,
    });
  }, [isPortrait, settings.wallpaper, settings.theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Manager Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "w":
          togglePanel("hero");
          break;
        case "e":
          togglePanel("monster");
          break;
        case "r":
          togglePanel("battle");
          break;
        case "escape":
          setOpenPanel(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [togglePanel]);

  /* Patreon OAuth, verified.
     
     This used to be a courtesy gate: the redirect's code went into
     localStorage, nothing ever exchanged it, and `getItem("patreon_code")`
     was the whole test — satisfiable from the console in four seconds. The
     exchange now happens in functions/api/patreon/, which is the only place
     that can hold the client secret, and the browser is told the answer
     rather than deciding it.

     The cost of that, paid once: an existing supporter's stored code means
     nothing any more, so they see the prompt and re-authorise. */
  const [isSupporter, setIsSupporter] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const settle = (state: { isSupporter: boolean; personId: string | null }) => {
      if (cancelled) return;
      setIsSupporter(state.isSupporter);
      /* The prompt waits for the answer instead of racing it. Defaulting it to
         visible meant every returning supporter got a flash of "support us"
         before the session came back and took it away again. */
      setOverlayVisible(ENABLE_PATREON && !state.isSupporter);
      /* A stable id across every device this patron signs in on — which is the
         only thing identify() is actually for, and the reason the exchange was
         worth building. Anonymous visitors stay anonymous. */
      if (state.personId) identifyPerson(state.personId);
    };

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      /* Off the URL before anything else can read it — the address bar, the
         referrer on the next outbound link, and any analytics pageview. */
      window.history.replaceState({}, document.title, window.location.pathname);
      exchangeCode(code).then(settle);
    } else {
      fetchSupporterState().then(settle);
    }

    forgetLegacyCode();
    return () => {
      cancelled = true;
    };
  }, []);

  /* A person property rather than an event: it describes who is sitting there,
     not something that just happened, so every event they have ever sent can be
     filtered by it. That is what makes "do supporters run bigger fights?" a
     question you can actually ask.

     The boolean, never the Patreon code that produced it. */
  useEffect(() => {
    setPerson({ is_supporter: isSupporter });
  }, [isSupporter]);

  /* Starts hidden and is raised once the server has answered — see settle(). */
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [battleOverlayVisible, setBattleOverlayVisible] = useState(false);
  /* Raised by the Options panel when a locked wallpaper is picked. Its own
     state rather than the battle one, because dismissing it should leave
     Options open — the battle prompt closes the panel behind it. */
  const [lockedOverlayVisible, setLockedOverlayVisible] = useState(false);

  useEffect(() => {
    if (openPanel === "battle" && !isSupporter && ENABLE_PATREON) {
      setBattleOverlayVisible(true);
    }
  }, [openPanel, isSupporter]);

  const handlePatreonLogin = () => {
    track("supporter_prompt_clicked", { reason: "header" });
    const clientId = import.meta.env.VITE_PATREON_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_PATREON_REDIRECT_URI;
    const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  };

  const panelContent: Record<PanelName, ReactNode> = {
    about: <AboutPanel onClose={handleClosePanel} />,
    hero: <HeroManager onClose={handleClosePanel} />,
    monster: <MonsterManager onClose={handleClosePanel} />,
    battle: <BattleManager onClose={handleClosePanel} />,
    options: (
      <OptionsPanel
        onClose={handleClosePanel}
        isSupporter={isSupporter}
        onLockedPick={() => setLockedOverlayVisible(true)}
      />
    ),
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
        <meta property="og:url" content="https://battletracker.simulacrumtechnologies.com/" />
        <link rel="canonical" href="https://battletracker.simulacrumtechnologies.com/" />
        <meta property="og:type" content="website" />
        <meta name="author" content="Simulacrum Technologies" />
        <meta name="language" content="English" />
        <meta property="og:image" content="https://battletracker.simulacrumtechnologies.com/og-image.png" />
        {/*
          Security headers live in public/_headers, which Cloudflare Pages serves
          as real HTTP headers. HSTS, X-Content-Type-Options, Referrer-Policy and
          Permissions-Policy are ignored entirely when set as <meta http-equiv>,
          so having them here did nothing. The CSP that used to sit here also
          blocked PostHog outright: it declared no connect-src, so every
          analytics request fell back to default-src 'self' and was refused.
        */}
      </Helmet>
      <RosterProvider>
        <CombatProvider>
          {overlayVisible && (
            <PatreonOverlay
              reason="first_visit"
              onClose={() => {
                setOverlayVisible(false);
              }}
            />
          )}

          {battleOverlayVisible && (
            <PatreonOverlay
              reason="battle_manager"
              onClose={() => {
                setBattleOverlayVisible(false);
                setOpenPanel(null);
              }}
            />
          )}

          {lockedOverlayVisible && (
            <PatreonOverlay
              reason="locked_wallpaper"
              onClose={() => setLockedOverlayVisible(false)}
            />
          )}

          <div id="header">
            <img id="logo" src={BTLogo} alt="D&D Battle Tracker" />

            {/* Folds the masthead away — logo, the four managers, the support
                note, Start the Battle, Edit Battle and the log — so the roster
                gets the whole screen mid-fight. The round and the timer stay:
                those are what you are reading while it is folded. */}
            <button
              type="button"
              id="mastheadToggle"
              aria-expanded={mastheadOpen}
              aria-label={mastheadOpen ? "Hide the menu" : "Show the menu"}
              title={mastheadOpen ? "Hide the menu" : "Show the menu"}
              onClick={() => setMastheadOpen((open) => !open)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>

            <Backdrop isOpen={openPanel !== null} onClick={handleClosePanel} />

            {PANEL_BUTTONS.map(({ panel, id, label, title, key }) => (
              <Fragment key={panel}>
                <button
                  id={id}
                  className="panelButton"
                  title={key ? `${title} (${key})` : title}
                  aria-label={openPanel === panel ? `Close ${label}` : label}
                  aria-expanded={openPanel === panel}
                  onClick={() => togglePanel(panel)}
                >
                  {key && (
                    /* The letter is drawn art (key_*.svg); the character stays
                       in the DOM as the alt text the image replaces. */
                    <span className="panelButtonKey" data-key={key} aria-hidden="true">
                      {key}
                    </span>
                  )}
                </button>
                {openPanel === panel && (
                  /* One panel throwing should cost that panel, not the fight
                     behind it — so each gets its own boundary, named after the
                     button that opened it. */
                  <ErrorBoundary variant="panel" label={label} onClose={handleClosePanel}>
                    <Suspense fallback={null}>{panelContent[panel]}</Suspense>
                  </ErrorBoundary>
                )}
              </Fragment>
            ))}

            {/* The tour is switched off and unreachable, but kept whole so it
                can be picked back up: `startTour` still exists, <Tour /> is
                still mounted in main.tsx, and the `tourReady` setting is still
                stored. Re-enabling it is deleting TOUR_ENABLED and this guard.
                See also the Options panel, where its toggle is hidden. */}
            {TOUR_ENABLED && settings.tourReady && !isPortrait && (
              <button
                id="buttonStartTour"
                onClick={() => {
                  startTour();
                  handleClosePanel();
                }}
              >
                Start Tour
              </button>
            )}

            <div id="patreonLink">
              {!isSupporter ? (
                <button onClick={handlePatreonLogin}>Support us on Patreon!</button>
              ) : (
                <div>
                  <p>✅ Thank you for your support!</p>{" "}
                  <p>
                    Don&apos;t forget to join our{" "}
                    <a href={DISCORD_URL} target="_blank" rel="noreferrer">
                      Discord Community
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>

            <AdSlot slot="tower" isSupporter={isSupporter} onSupport={handlePatreonLogin} />
          </div>

          <AdSlot slot="banner" isSupporter={isSupporter} onSupport={handlePatreonLogin} />

          {/* The roster is the app, but it is not the whole page: keeping the
              masthead alive means a crash here can still be answered by opening
              the Battle Manager and loading a different fight. */}
          <ErrorBoundary variant="panel" label="The battle tracker" placement="inline">
            <BattleTracker />
          </ErrorBoundary>

          <div id="footer">
            ©{new Date().getFullYear()}{" "}
            <a href="https://www.simulacrumtechnologies.com" target="_blank" rel="noreferrer">
              Simulacrum Technologies
            </a>
            . All rights reserved.{" "}
            {/* Wrapped so portrait can put it on a line of its own. Inline it
                stays exactly as it reads now; see .footerFinePrint. */}
            <span className="footerFinePrint">
              Website design and content are protected by copyright law. Built by DMs, for DMs.
            </span>
            <p>
              Join our{" "}
              <a href={DISCORD_URL} target="_blank" rel="noreferrer">
                Discord server
              </a>{" "}
              for updates and to provide feedback.
            </p>
          </div>

          <ConsentBanner />

          <DialogHost />
          {/* Boundaries cannot see a throw inside an onClick or a rejected
              promise. This does. */}
          <GlobalErrorNotice />
        </CombatProvider>
      </RosterProvider>
    </>
  );
}

export default App;
