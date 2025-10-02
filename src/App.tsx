import BattleTracker from "./components/BattleTracker/BattleTracker";
import HeroManager from "./components/HeroManager/HeroManager";
import MonsterManager from "./components/MonsterManager/MonsterManager";
import { useState } from "react";

function App() {
  const [showHeroManager, setShowHeroManager] = useState(false);
  const [showMonsterManager, setShowMonsterManager] = useState(false);

  return (
    <div id="display">
      <h1>D&D Battle Tracker</h1>

      <p>
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
      {showMonsterManager && <MonsterManager />}

      <BattleTracker />
    </div>
  );
}

export default App;
