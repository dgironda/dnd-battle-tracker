import { DEVMODE } from "../../utils/devmode";

import { Combatant } from "../../types/index";

interface Props {
  combatants: Combatant[];
  currentTurn: number;
  setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
  setCurrentTurn: React.Dispatch<React.SetStateAction<number>>;
}

export default function CombatantList({
  combatants,
  currentTurn,
  setCombatants,
  setCurrentTurn,
}: Props) {
  const nextTurn = () => {
    setCurrentTurn((prev) => (combatants.length ? (prev + 1) % combatants.length : 0));
  };

  const updateHP = (id: string, newHP: number) => {
    setCombatants((prev) =>
      prev.map((combatant) => (combatant.id === id ? { ...combatant, currHp: newHP } : combatant)).sort((a, b) => b.initiative - a.initiative)
    );
  };

  return (
    <div>
      <button onClick={nextTurn} style={{ marginBottom: "1rem" }}>
        Next Turn
      </button>
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
          {combatants
            .sort((a, b) => b.initiative - a.initiative)
            .map((c, index) => (
              <tr
                key={c.id}
                style={{
                  backgroundColor: index === currentTurn ? "#d1ffd6" : "transparent",
                }}
              >
                <td title={c.stats}>{c.name}</td>
                <td>{c.initiative}</td>
                <td>
                  <input
                    type="number"
                    value={c.currHp}
                    min={0}
                    max={c.maxHp}
                    onChange={(e) => updateHP(c.id, Number(e.target.value))}
                    style={{ width: "50px" }}
                  />{" "}
                  / {c.maxHp}
                </td>
                {/* <td>{c.AC}</td> */}
                <td>{c.conditions.join(", ")}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
