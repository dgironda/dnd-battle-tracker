import React from "react";
import { useState, useEffect } from "react";
import BattleTracker from "./components/BattleTracker/BattleTracker";
import HeroManager from "./components/HeroManager/HeroManager";
import MonsterManager from "./components/MonsterManager/MonsterManager";
import BattleManager from "./components/BattleManager/BattleManager";
import About from "./components/About";
import Options from "./components/Options";
import ToggleComponent from "./components/ToggleContext";
import { CombatProvider } from "./components/BattleTracker/CombatContext";
import { useBattleManager } from "./hooks/useStartBattle";
import PatreonOverlay from "./components/PatreonOverlay";
import { DEVMODE } from "./utils/devmode";
import { useGlobalContext } from "./hooks/optionsContext";
import "./components/BattleManager/BattleManager.css";
import { Helmet } from "react-helmet-async";
import monsterShareURL from "./utils/monsterShareURL";
import { startTour } from "./components/Tour";





const ENABLE_PATREON = !DEVMODE;

function App() {
  const [showHeroManager, setShowHeroManager] = useState(false);
  const [showMonsterManager, setShowMonsterManager] = useState(false);
  const [openPanel, setOpenPanel] = useState<'hero' | 'monster' | 'battle' | 'about' | 'options' | null>(null);
  const { settings } = useGlobalContext();
  const handleClosePanel = () => setOpenPanel(null);
  const [isPortrait, setIsPortrait] = useState(
    window.matchMedia("(orientation: portrait)").matches
  );

  useEffect(() => {
    monsterShareURL.loadMonstersFromURL()
}, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
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
      
      switch(e.key.toLowerCase()) {
        case 'w':
          setOpenPanel(openPanel === 'monster' ? null : 'monster');
          break;
        case 'e':
          setOpenPanel(openPanel === 'hero' ? null : 'hero');
          break;
        case 'r':
          setOpenPanel(openPanel === 'battle' ? null : 'battle');
          break;
      }
    };
  
    // Add event listener
    window.addEventListener('keydown', handleKeyPress);
  
    // Cleanup: remove listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  });

  // Patreon OAuth
  const [isSupporter, setIsSupporter] = useState(false);

  useEffect(() => {
    if (!ENABLE_PATREON){
      setIsSupporter(true);
      return;
    } 
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // Store the code so we know they've logged in
      localStorage.setItem("patreon_code", code);
      setIsSupporter(true);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (localStorage.getItem("patreon_code")) {
      setIsSupporter(true);
    }
  }, []);
  
  //Overlay
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
    if (openPanel === 'battle' && !isSupporter && ENABLE_PATREON) {
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
      <meta name="description" content="Keep your combat clean and simple with the D&D Battle Tracker. Featuring automatic turn advancement, integrated Hero/Monster managers, and instant condition reminders for faster gameplay" />
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
    </Helmet>
    <CombatProvider>
    {overlayVisible && (<PatreonOverlay onClose={() => {
      setOverlayVisible(false);
    }} />)}

    {battleOverlayVisible && (
        <PatreonOverlay onClose={() => {
          setBattleOverlayVisible(false);
          setOpenPanel(null);
        }} />
      )}
      
    <div id="header">
      <h1 id="logo">D&D Battle Tracker</h1>
      <About 
        isVisible={openPanel === 'about'} 
        onToggle={() => setOpenPanel(openPanel === 'about' ? null : 'about')} 
      />
      
        <button id="heroManagerButton" title="Add, Update, and Delete Heroes" onClick={() => setOpenPanel(openPanel === 'hero' ? null : 'hero')}>
          {openPanel === 'hero' ? (<span>Close Hero Manager<sup>(e)</sup></span>) : (<span>Hero Manager<sup>(e)</sup></span>)}
        </button>
        {openPanel === 'hero' && (<HeroManager onClose={handleClosePanel}/>)}
        
        <button id="monsterManagerButton" title="Add, Update, and Delete Monsters" onClick={() => setOpenPanel(openPanel === 'monster' ? null : 'monster')}>
          {openPanel === 'monster' ? (<span>Close Monster Manager<sup>(w)</sup></span>) : (<span>Monster Manager<sup>(w)</sup></span>)}
        </button>
      {openPanel === 'monster' && (<MonsterManager onClose={handleClosePanel}/>)}
      
      <button id="battleManagerButton" title="Save and Load Battles" onClick={() => setOpenPanel(openPanel === 'battle' ? null : 'battle')}>
        {openPanel === 'battle' ? (<span>Close Battle Manager<sup>(r)</sup></span>) : (<span>Battle Manager<sup>(r)</sup></span>)}
      </button>
      {openPanel === 'battle' && (<BattleManager onClose={handleClosePanel}/>)}
      
      <Options 
        isVisible={openPanel === 'options'} 
        onToggle={() => setOpenPanel(openPanel === 'options' ? null : 'options')} 
        isSupporter={isSupporter}
      />
      <button onClick={() => {
                startTour();
                handleClosePanel();
              }}>Start Tour</button>
      
    
    
      
		  
	  {/* Patreon link */}
      <div id="patreonLink">
        {!isSupporter ? (
            <button
                onClick={handlePatreonLogin}
            >
              Support us on Patreon!
            </button>
        ) : (
            <div>
              <p>✅ Thank you for your support!</p> <p>Don't forget to join our <a href="https://discord.gg/m4AnYSDueM" target="_blank">Discord Community</a>.</p>
            </div>
        )}
      </div>
    </div>
      
  
    <BattleTracker
      setShowHeroManager={setShowHeroManager} 
      setShowMonsterManager={setShowMonsterManager}  
    />
    <div id="footer">
      
      ©2025 <a href="https://www.simulacrumtechnologies.com" target="_blank">Simulacrum Technologies</a>. All rights reserved. Website design and content are protected by copyright law. Built by DMs, for DMs.
      <p>Join our <a href="https://discord.gg/m4AnYSDueM" target="_blank">Discord server</a> for updates and to provide feedback.</p>
    </div>
  
    </CombatProvider>
    </>
  );
}

export default App;
