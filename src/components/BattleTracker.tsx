// src/components/BattleTracker.tsx
import React, { useState } from "react";
import HeroManager from "./HeroManager";

const BattleTracker: React.FC = () => {
  const [showHeroManager, setShowHeroManager] = useState(false);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>D&D Battle Tracker</h1>

      {/* Toggle Hero Manager */}
      <button
        onClick={() => setShowHeroManager((prev) => !prev)}
        style={{ marginBottom: "1rem" }}
      >
        {showHeroManager ? "Close Hero Manager" : "Add Hero"}
      </button>

      {showHeroManager && <HeroManager />}

      {/* Placeholder for existing tracker UI */}
      <div>
        <button id="buttonNextTurn">Next Turn</button>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Initiative</th>
              <th>HP</th>
              <th>AC</th>
              <th>Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: "rgb(209, 255, 214)" }}>
              <td>Hero</td>
              <td>15</td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="40"
                  defaultValue={40}
                  style={{ width: "50px" }}
                />{" "}
                / 40
              </td>
              <td>16</td>
              <td></td>
            </tr>
            <tr>
              <td>Goblin</td>
              <td>12</td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="7"
                  defaultValue={7}
                  style={{ width: "50px" }}
                />{" "}
                / 7
              </td>
              <td>13</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BattleTracker;
