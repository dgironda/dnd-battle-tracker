import React, { useState } from "react";
import { DEVMODE } from "../../utils/devmode";
import { useMonsters } from "../../hooks/useMonsters";
import { Monster } from "../../types/Monster";
import { createUpdateMonster, createDeleteMonster, EditableCell } from "../../utils/Utils";
import { useGlobalContext } from "../../hooks/optionsContext";
import { useCombat } from "../BattleTracker/CombatContext";
import monstersDataFourteen from "../../assets/2014monsters.json";
import monstersDataTwentyFour from "../../assets/2024monsters.json";

interface MonsterManagerProps {
  onClose: () => void;
}

const MonsterManager: React.FC<MonsterManagerProps> = ({ onClose }) => {
  const { monsters, setMonsters } = useMonsters();
  const { settings } = useGlobalContext();
  const monstersData = settings.version === "twentyFourteen" ? monstersDataFourteen : monstersDataTwentyFour;
  const { addMonsterToCombat } = useCombat();

  const initialMonster: Monster = {
    id: crypto.randomUUID(),
    name: "",
    link: "https://5e.tools",
    hp: 0,
    currHp: 0,
    maxHp: 0,
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
    present: false,
    conditions: [],
  };

  const [newMonster, setNewMonster] = useState<Monster>(initialMonster);
  const [duplicateCount, setDuplicateCount] = useState(1);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleDuplicateCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, parseInt(e.target.value)) || 1;
    setDuplicateCount(value);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMonster({ ...newMonster, name: value });

    if (!value.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const matches = monstersData
      .filter((m) => m.name.toLowerCase().indexOf(value.toLowerCase()) !== -1)
      .map((m) => m.name);

    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const handleSelectSuggestion = (name: string) => {
    const selected = monstersData.find((m) => m.name === name);
    if (selected) setNewMonster({ ...newMonster, ...selected, id: crypto.randomUUID() });
    setShowSuggestions(false);
  };

  const addMonsters = (count: number) => {
    if (!newMonster.name.trim() || count <= 0) return;

    let newMonsters: Monster[] = [];
    const existingNames = new Set(monsters.map((m) => m.name));

    for (let i = 0; i < count; i++) {
      let uniqueName = newMonster.name;
      let suffix = 1;
      while (existingNames.has(uniqueName)) {
        uniqueName = `${newMonster.name} ${suffix}`;
        suffix++;
      }
      newMonsters.push({ ...newMonster, id: crypto.randomUUID(), name: uniqueName });
      existingNames.add(uniqueName);
    }

    setMonsters((prev) => [...prev, ...newMonsters]);
    setNewMonster(initialMonster);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setDuplicateCount(1);
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

  const updateMonster = createUpdateMonster(setMonsters);
  const deleteMonster = createDeleteMonster(monsters, setMonsters);

  const keyDownAddMonster = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addMonsters(1);
    }
  };

  return (
    <div id="monsterAddManage">
      <h2>Monster Manager</h2>

      <div id="addMonsterOuter">
        <div className="nameInputWrapper">
          <input
            id="monsterNameInput"
            type="text"
            placeholder="Search or custom Monster Name"
            value={newMonster.name}
            onKeyDown={keyDownAddMonster}
            onChange={handleNameChange}
            autoComplete="off"
          />
          {showSuggestions && (
            <ul className="suggestion-list">
              {filteredSuggestions.map((s) => (
                <li key={s} onClick={() => handleSelectSuggestion(s)} className="filteredSuggestions">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <button onClick={() => addMonsters(1)}>Add Monster</button>
        </div>

        <div>
          <input type="number" min="1" max="50" value={duplicateCount} onChange={handleDuplicateCountChange} />
          <button onClick={() => addMonsters(duplicateCount)}>Add Monsters</button>
        </div>
      </div>

      <table id="monsterManagerTable">
        <thead>
          <tr id="monsterManagerHeader">
            <th>Name</th>
            <th>HP</th>
            <th>AC</th>
            <th>Hiding?</th>
            <th>Ready For Next Battle</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="monsterTableBody">
          {monsters.map((m) => (
            <React.Fragment key={m.id}>
              <tr className="monsterManagerMonster">
                <td>
                  <EditableCell entity={m} field="name" type="text" editingField={editingField} setEditingField={setEditingField} updateEntity={updateMonster} />
                </td>
                <td>
                  <EditableCell entity={m} field="hp" type="number" editingField={editingField} setEditingField={setEditingField} updateEntity={updateMonster} />
                </td>
                <td>
                  <EditableCell entity={m} field="ac" type="number" editingField={editingField} setEditingField={setEditingField} updateEntity={updateMonster} />
                </td>
                <td>
                  <input type="checkbox" checked={m.hidden} onChange={() => toggleHidden(m.id)} />
                </td>
                <td onClick={() => updateMonster(m.id, "present", !m.present)} className="pointer">
                  {m.present ? "✅" : "❌"}
                </td>
                <td>
                  <button onClick={async () => { await addMonsterToCombat(m); deleteMonster(m.id, true); }}>Add to Existing Battle</button>
                  <button onClick={() => deleteMonster(m.id)}>Delete</button>
                </td>
              </tr>
              <tr className="statsRow">
                <td colSpan={6}>
                  <div className="heroStats">
                    {["str", "dex", "con", "int", "wis", "cha", "pp", "init"].map((stat) => (
                      <span key={stat}>
                        {stat.toUpperCase()}: <EditableCell entity={m} field={stat as keyof Monster} type="number" editingField={editingField} setEditingField={setEditingField} updateEntity={updateMonster} />
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </React.Fragment>
          ))}
          {monsters.length === 0 && (
            <tr>
              <td colSpan={6}>No monsters yet, try adding one.</td>
            </tr>
          )}
        </tbody>
      </table>

      <button id="mmSaveCloseButton" onClick={onClose}>Save and Close</button>
    </div>
  );
};

export default MonsterManager;
