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

  return (
    <CombatProvider>
    <div id="header">
      
      <About 
        isVisible={openPanel === 'about'} 
        onToggle={() => setOpenPanel(openPanel === 'about' ? null : 'about')} 
      />
      
      <button title="Add, Update, and Delete Heroes" onClick={() => setOpenPanel(openPanel === 'hero' ? null : 'hero')}>
        {openPanel === 'hero' ? "Close Hero Manager" : "Hero Manager"}
      </button>
      {openPanel === 'hero' && <HeroManager />}
      
      <button title="Add, Update, and Delete Monsters" onClick={() => setOpenPanel(openPanel === 'monster' ? null : 'monster')}>
        {openPanel === 'monster' ? "Close Monster Manager" : "Monster Manager"}
      </button>
      {openPanel === 'monster' && <MonsterManager />}
      
      <ToggleComponent />
    </div>
    <div id="display">
      <h1>D&D Battle Tracker</h1>
		  
	  {/* Patreon link */}
  <div style={{ margin: '1rem 0', textAlign: 'center' }}>
    <a 
      href="https://patreon.com/SimTech?utm_medium=unknown&utm_source=battle_tracker&utm_campaign=main_site&utm_content=copyLink" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}
    >
      <span style={{ fontWeight: 'bold', color: '#e85b46', fontSize: '16px' }}>
        Support us on Patreon!
      </span>
    </a>
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
