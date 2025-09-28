import BattleTracker from "./components/BattleTracker";
import HeroManager from "./components/HeroManager";
import MonsterManager from "./components/MonsterManager";
import { useState } from "react";

function App() {
  const [showHeroManager, setShowHeroManager] = useState(false);
  const [showMonsterManager, setShowMonsterManager] = useState(false);

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h1>D&D Battle Tracker</h1>

      <button onClick={() => setShowHeroManager(!showHeroManager)}>
        {showHeroManager ? "Close Hero Manager" : "Open Hero Manager"}
      </button>
      {showHeroManager && <HeroManager />}

      <button onClick={() => setShowMonsterManager(!showMonsterManager)}>
        {showMonsterManager ? "Close Monster Manager" : "Open Monster Manager"}
      </button>
      {showMonsterManager && <MonsterManager />}

      <BattleTracker />
    </div>
  );
}

export default App;
