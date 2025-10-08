import { useState } from "react";
import { useMonsters } from "../../hooks/useMonsters";
import { Monster } from "../../types/Monster";
import { createUpdateMonster, createDeleteMonster } from "../Utils";
import { EditableCell } from "../Utils";

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
    setNewMonster({ id: crypto.randomUUID(), name: "", hp: 0, ac: 0, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, pp: 10, init: 0, hidden: false, conditions: [] });
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

  const [editingField, setEditingField] = useState<string | null>(null);
  const updateMonster = createUpdateMonster(setMonsters);
  // const deleteMonster = (id: string) => {
  //   setMonsters(monsters.filter((m) => m.id !== id));
  // };
  const deleteMonster = createDeleteMonster(monsters, setMonsters);

  return (
    <div id="monsterAddManage">
      <h2>Monster Manager <sup>(Click to edit)</sup></h2>
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
          <tr key="monsterheader">
            <th>Name</th>
            <th>HP</th>
            <th>AC</th>
            <th>Hidden?</th>
            <th>Conditions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className="monsterTableBody">
          {monsters.map((m) => (
            <>
            <tr key={m.id}>
              <td>
                <span title="Name"><EditableCell 
                                    entity={m} 
                                    field="name" 
                                    type="text"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span></td>
              <td>
                <span title="HP"><EditableCell 
                                    entity={m} 
                                    field="hp" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                </td>
              <td>
                <span title="AC"><EditableCell 
                                    entity={m} 
                                    field="ac" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={m.hidden}
                  onChange={() => toggleHidden(m.id)}
                />
              </td>
              <td>{m.conditions.join(", ")}</td>
              <td>
                <button className="buttonDelete" onClick={() => deleteMonster(m.id)}>Delete</button>
              </td>
            </tr>
            <tr key={`${m.id}-stats`} className="statsRow">
              <td 
                                colSpan={6} 
                                style={{ 
                                  border: '1px solid #ccc', 
                                  padding: '8px', 
                                  fontSize: '12px'
                                }}
                              >
                                <div className="heroStats">
                                  <span title="Strength">STR: <EditableCell 
                                    entity={m} 
                                    field="str" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                  <span title="Dexterity">DEX: <EditableCell 
                                    entity={m} 
                                    field="dex" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                  <span title="Constitution">CON: <EditableCell 
                                    entity={m} 
                                    field="con" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                  <span title="Intelligence">INT: <EditableCell 
                                    entity={m} 
                                    field="int" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                  <span title="Wisdom">WIS: <EditableCell 
                                    entity={m} 
                                    field="wis" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                  <span title="Charisma">CHA: <EditableCell 
                                    entity={m} 
                                    field="cha" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                  <span title="Passive Perception">PP: <EditableCell 
                                    entity={m} 
                                    field="pp" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                  <span title="Initiative Bonus">Init: <EditableCell 
                                    entity={m} 
                                    field="init" 
                                    type="number"
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    updateEntity={updateMonster}
                                  /></span>
                                </div>
                              </td>
            </tr>
            </>
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
