import { useState, useContext } from "react";
import { useMonsters } from "../../hooks/useMonsters";
import { Monster } from "../../types/Monster";
import { createUpdateMonster, createDeleteMonster } from "../Utils";
import { EditableCell } from "../Utils";
import { useGlobalContext } from "../../hooks/versionContext";
import { useCombat } from "../BattleTracker/CombatContext";
import { InitiativeDialog } from "../BattleTracker/InitiativeDialog";
import monstersDataFourteen from "../../assets/2014monsters.json";
import monstersDataTwentyFour from "../../assets/2024monsters.json"

interface MonsterManagerProps {
  onClose: () => void;
}

const MonsterManager: React.FC<MonsterManagerProps> = ({ onClose }) => {
  const { monsters, setMonsters } = useMonsters();
  const [newMonster, setNewMonster] = useState<Monster>({
    id: crypto.randomUUID(),
    name: "",
    link: "https://5e.tools",
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
    present: false,
    conditions: [],
  });

  const { status } = useGlobalContext();
  // const monstersData = monstersDataFourteen
  const monstersData = status === 'twentyFourteen' ? monstersDataFourteen : monstersDataTwentyFour; // Turn this on when monstersDataTwentyFour is added above
  const [showMonsterManager, setShowMonsterManager] = useState(true);
  const { addMonsterToCombat } = useCombat();

  // 🔹 Autocomplete states
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 🔹 Handle typing in the name input
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMonster({ ...newMonster, name: value });

    if (!value.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const matches = monstersData
      .filter((m) => m.name.toLowerCase().includes(value.toLowerCase()))
      .map((m) => m.name);

    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  // 🔹 When user clicks a suggestion
  const handleSelectSuggestion = (name: string) => {
    const selected = monstersData.find((m) => m.name === name);
    if (selected) {
      setNewMonster({
        ...newMonster,
        ...selected,
        id: crypto.randomUUID(),
      });
    }
    setShowSuggestions(false);
  };

  // 🔹 Add monster to table
  const addMonster = () => {
    if (!newMonster.name.trim()) return;
    setMonsters([...monsters, { ...newMonster, id: crypto.randomUUID() }]);
    setNewMonster({
      id: crypto.randomUUID(),
      name: "",
      link: "https://5e.tools",
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
      present: false,
      conditions: [],
    });
    setFilteredSuggestions([]);
    setShowSuggestions(false);
  };

  // 🔹 Toggle hidden/invisible
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
  const deleteMonster = createDeleteMonster(monsters, setMonsters);
  const keyDownAddMonster = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); 
      addMonster(); 
    }
  };

  return (
    <div id="monsterAddManage">
      <h2>
        Monster Manager
      </h2>

      <div id="addMonsterOuter">
        {/* 🔹 Name input with autocomplete */}
        <div className="nameInputWrapper" style={{ position: "relative" }}>
          <input
            type="text"
            size={50}
            placeholder="Monster Name"
            value={newMonster.name}
            onKeyDown={keyDownAddMonster}
            onChange={handleNameChange}
            autoComplete="off"
          />
          {showSuggestions && (
            <ul
              className="suggestion-list"
            >
              {filteredSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.background = "#888")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.background = "transparent")
                  }
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* <input
          type="number"
          placeholder="HP"
          value={newMonster.hp}
          onChange={(e) =>
            setNewMonster({ ...newMonster, hp: Number(e.target.value) })
          }
        />
        <input
          type="number"
          placeholder="AC"
          value={newMonster.ac}
          onChange={(e) =>
            setNewMonster({ ...newMonster, ac: Number(e.target.value) })
          }
        /> */}
        <div><button onClick={addMonster}>Add Monster</button></div>
      </div>

      <table>
        <thead>
          <tr key="monsterheader">
            <th title="Monster's name, unique names are recommended">Name</th>
            <th title="Maximum HP amount, current can be adjusted in battle">HP</th>
            <th title="Armor Class">AC</th>
            <th title="If checked, monster starts combat as invisible.">
              Hidden?
            </th>
            <th title="Are they present for this Battle">Present</th>
            <th></th>
          </tr>
        </thead>

        <tbody className="monsterTableBody">
          {monsters.map((m) => (
            <>
              <tr key={m.id}>
                <td>
                  <span title="Name">
                    <EditableCell
                      entity={m}
                      field="name"
                      type="text"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateMonster}
                    />
                  </span>
                </td>
                <td>
                  <span title="HP">
                    <EditableCell
                      entity={m}
                      field="hp"
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateMonster}
                    />
                  </span>
                </td>
                <td>
                  <span title="AC">
                    <EditableCell
                      entity={m}
                      field="ac"
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateMonster}
                    />
                  </span>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={m.hidden}
                    onChange={() => toggleHidden(m.id)}
                  />
                </td>
                <td>
                  <span
                    onClick={() =>
                      updateMonster(m.id, "present", !m.present)
                    }
                    className="pointer"
                    title="Click to toggle"
                  >
                    {m.present ? "✅" : "❌"}
                  </span>
                </td>
                <td>
                  <button
                    title="Add this monster to the battle in progress."
                    className="buttonAddMonsterToCombat"
					onClick={async () => {
						  await addMonsterToCombat(m); // Wait for initiative dialog to finish
						  deleteMonster(m.id, true);   // Then remove from monster manager, the true parameter skips the prompt
						}}

                  >
                    Add to Existing Battle
                  </button>
                  <button
                    title="Delete this monster, will ask for comfirmation"
                    className="buttonDelete"
                    onClick={() => deleteMonster(m.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>

              {/* Stats Row */}
              <tr key={`${m.id}-stats`} className="statsRow">
                <td colSpan={6}>
                  <div className="heroStats">
                    {[
                      "str",
                      "dex",
                      "con",
                      "int",
                      "wis",
                      "cha",
                      "pp",
                      "init",
                    ].map((stat) => (
                      <span key={stat} title={stat.toUpperCase()}>
                        {stat.toUpperCase()}:{" "}
                        <EditableCell
                          entity={m}
                          field={stat as keyof Monster}
                          type="number"
                          editingField={editingField}
                          setEditingField={setEditingField}
                          updateEntity={updateMonster}
                        />
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
              
            </>
          ))}

          {monsters.length === 0 && (
            <tr key={"noMonsters"}>
              <td colSpan={6} id="noMonsters">
                No monsters yet, try adding one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="saveClose">
                    <button title="Save and Close" onClick={onClose}>Save and Close</button>
              </p>
    </div>
  );
};

export default MonsterManager;
