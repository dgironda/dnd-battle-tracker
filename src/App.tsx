import BattleTracker from "./components/BattleTracker/BattleTracker";
import HeroManager from "./components/HeroManager/HeroManager";
import MonsterManager from "./components/MonsterManager/MonsterManager";
import About from "./About";
import ToggleComponent from "./components/ToggleContext";
import { useState } from "react";

function App() {
  const [showHeroManager, setShowHeroManager] = useState(false);
  const [showMonsterManager, setShowMonsterManager] = useState(false);
  const [openPanel, setOpenPanel] = useState<'hero' | 'monster' | 'about' | null>(null);


  return (
    <>
    <div id="header">
      <About 
        isVisible={openPanel === 'about'} 
        onToggle={() => setOpenPanel(openPanel === 'about' ? null : 'about')} 
      />
      
      <button onClick={() => setOpenPanel(openPanel === 'hero' ? null : 'hero')}>
        {openPanel === 'hero' ? "Close Hero Manager" : "Hero Manager"}
      </button>
      {openPanel === 'hero' && <HeroManager />}
      
      <button onClick={() => setOpenPanel(openPanel === 'monster' ? null : 'monster')}>
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
      href="https://patreon.com/DNDDMDave?utm_medium=unknown&utm_source=battle_tracker&utm_campaign=main_site&utm_content=copyLink" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}
    >
      <span style={{ fontWeight: 'bold', color: '#e85b46', fontSize: '16px' }}>
        Support us on Patreon!
      </span>
    </a>
  </div>
  
      {/* <p>
        <button onClick={() => setShowHeroManager(!showHeroManager)}>
          {showHeroManager ? "Close Hero Manager" : "Open Hero Manager"}
        </button>
      </p>
      {showHeroManager && <HeroManager />}

      <p>
        <button onClick={() => setShowMonsterManager(!showMonsterManager)}>
          {showMonsterManager ? "Close Monster Manager" : "Open Monster Manager"}
        </button>
      </p>
      {showMonsterManager && <MonsterManager />} */}

      <BattleTracker
        setShowHeroManager={setShowHeroManager} 
        setShowMonsterManager={setShowMonsterManager}  
      />
    </div>
    </>
  );
}

export default App;
