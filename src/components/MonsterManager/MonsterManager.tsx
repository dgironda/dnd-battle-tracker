import { useState } from "react";
import { useMonsters } from "../../hooks/useMonsters";
import { Monster } from "../../types/Monster";
import { createUpdateMonster, createDeleteMonster } from "../Utils";
import { EditableCell } from "../Utils";
import monstersDataFourteen from "../../assets/2014monsters.json";

const MonsterManager = () => {
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

    const matches = monstersDataFourteen
      .filter((m) => m.name.toLowerCase().includes(value.toLowerCase()))
      .map((m) => m.name);

    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  // 🔹 When user clicks a suggestion
  const handleSelectSuggestion = (name: string) => {
    const selected = monstersDataFourteen.find((m) => m.name === name);
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

  return (
    <div id="monsterAddManage">
      <h2>
        Monster Manager <sup>(Click to edit)</sup>
      </h2>

      <div id="addMonsterOuter">
        {/* 🔹 Name input with autocomplete */}
        <div className="nameInputWrapper" style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Monster Name"
            value={newMonster.name}
            onChange={handleNameChange}
            autoComplete="off"
          />
          {showSuggestions && (
            <ul
              className="suggestion-list"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#1e1e1e",
                border: "1px solid #666",
                listStyle: "none",
                padding: 0,
                margin: "2px 0 0 0",
                borderRadius: "4px",
                maxHeight: "150px",
                overflowY: "auto",
                zIndex: 100,
              }}
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
                    ((e.target as HTMLElement).style.background = "#333")
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

        <input
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
            <th>Present</th>
            <th>Actions</th>
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
    </div>
  );
};

export default MonsterManager;
