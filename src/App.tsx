import BattleTracker from "./components/BattleTracker/BattleTracker";
import HeroManager from "./components/HeroManager/HeroManager";
import MonsterManager from "./components/MonsterManager/MonsterManager";
import About from "./About";
import ToggleComponent from "./components/ToggleContext";
import { useState, useEffect } from "react";
import { CombatProvider } from "./components/BattleTracker/CombatContext";


function App() {
  const [showHeroManager, setShowHeroManager] = useState(false);
  const [showMonsterManager, setShowMonsterManager] = useState(false);
  const [openPanel, setOpenPanel] = useState<'hero' | 'monster' | 'about' | null>(null);
  
  const handleClosePanel = () => setOpenPanel(null);
  

    // Manager Keyboard shortcuts
    useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch(e.key.toLowerCase()) {
        case 'w':
          setOpenPanel(openPanel === 'monster' ? null : 'monster');
          break;
        case 'e':
          setOpenPanel(openPanel === 'hero' ? null : 'hero');
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
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // Store the code so we know they’ve logged in
      localStorage.setItem("patreon_code", code);
      setIsSupporter(true);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (localStorage.getItem("patreon_code")) {
      setIsSupporter(true);
    }
  }, []);

  const handlePatreonLogin = () => {
    const clientId = import.meta.env.VITE_PATREON_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_PATREON_REDIRECT_URI;
    const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  };


  return (
    <CombatProvider>
    <div id="header">
      
      <About 
        isVisible={openPanel === 'about'} 
        onToggle={() => setOpenPanel(openPanel === 'about' ? null : 'about')} 
      />
      
      <button title="Add, Update, and Delete Heroes" onClick={() => setOpenPanel(openPanel === 'hero' ? null : 'hero')}>
        {openPanel === 'hero' ? (<span>Close Hero Manager<sup>(e)</sup></span>) : (<span>Hero Manager<sup>(e)</sup></span>)}
      </button>
      {openPanel === 'hero' && (<HeroManager onClose={handleClosePanel}/>)}
      
      <button title="Add, Update, and Delete Monsters" onClick={() => setOpenPanel(openPanel === 'monster' ? null : 'monster')}>
        {openPanel === 'monster' ? (<span>Close Monster Manager<sup>(w)</sup></span>) : (<span>Monster Manager<sup>(w)</sup></span>)}
      </button>
      {openPanel === 'monster' && (<MonsterManager onClose={handleClosePanel}/>)}
      
      <ToggleComponent />
    </div>
    <div id="display">
      <h1>D&D Battle Tracker</h1>
		  
	  {/* Patreon link */}
      <div style={{ margin: '1rem 0', textAlign: 'center' }}>
        {!isSupporter ? (
            <button
                onClick={handlePatreonLogin}
                style={{
                  backgroundColor: '#e85b46',
                  color: 'white',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}
            >
              Support us on Patreon!
            </button>
        ) : (
            <p style={{ color: '#4caf50', fontWeight: 'bold' }}>
              ✅ Thank you for your support!
            </p>
        )}
      </div>

      <BattleTracker
        setShowHeroManager={setShowHeroManager} 
        setShowMonsterManager={setShowMonsterManager}  
      />
      
    </div>
    </CombatProvider>
  );
}

export default App;
