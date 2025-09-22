import BattleTracker from "./components/BattleTracker";
import HeroManager from "./components/HeroManager";

function App() {
  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h1>D&D Battle Tracker</h1>
      <BattleTracker />
      <HeroManager />
    </div>
  );
}

export default App;
