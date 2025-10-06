import { useState } from "react";
import { useMonsters } from "../../hooks/useMonsters";
import { Monster } from "../../types/Monster";

const MonsterManager = () => {
  const { monsters, setMonsters } = useMonsters();
  const [newMonster, setNewMonster] = useState<Monster>({
    id: crypto.randomUUID(),
    name: "",
    hp: 0,
    ac: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
    init: 0,
    hidden: false,
    conditions: [],
  });

  const addMonster = () => {
    if (!newMonster.name.trim()) return;
    setMonsters([...monsters, { ...newMonster, id: crypto.randomUUID() }]);
    setNewMonster({ id: crypto.randomUUID(), name: "", hp: 0, ac: 0, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, pp: 10, init: 0,hidden: false, conditions: [] });
  };

  const toggleHidden = (id: string) => {
    setMonsters(
      monsters.map((m) =>
        m.id === id
          ? {
              ...m,
              hidden: !m.hidden,
              conditions: m.hidden
                ? m.conditions.filter((c) => c !== "Invisible")
                : [...new Set([...m.conditions, "Invisible"])],
            }
          : m
      )
    );
  };

  const deleteMonster = (id: string) => {
    setMonsters(monsters.filter((m) => m.id !== id));
  };

  return (
    <div id="monsterAddManage" style={{ marginTop: "2rem" }}>
      <h2>Monster Manager</h2>
      <div id="addMonsterOuter">
        <input
          type="text"
          placeholder="Monster Name"
          value={newMonster.name}
          onChange={(e) => setNewMonster({ ...newMonster, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="HP"
          value={newMonster.hp}
          onChange={(e) => setNewMonster({ ...newMonster, hp: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="AC"
          value={newMonster.ac}
          onChange={(e) => setNewMonster({ ...newMonster, ac: Number(e.target.value) })}
        />
        <button onClick={addMonster}>Add Monster</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>HP</th>
            <th>AC</th>
            <th>Hidden?</th>
            <th>Conditions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {monsters.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.hp}</td>
              <td>{m.ac}</td>
              <td>
                <input
                  type="checkbox"
                  checked={m.hidden}
                  onChange={() => toggleHidden(m.id)}
                />
              </td>
              <td>{m.conditions.join(", ")}</td>
              <td>
                <button onClick={() => deleteMonster(m.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {monsters.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#666" }}>
                No monsters yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MonsterManager;
