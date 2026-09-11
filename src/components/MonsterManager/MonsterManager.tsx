import React, { useEffect, useMemo, useState } from "react";
import { useMonsters } from "../../hooks/useMonsters";
import { Monster } from "../../types/Monster";
import { createUpdateMonster, createDeleteMonster, EditableCell } from "../../utils/Utils";
import { rankByName } from "../../utils/searchRank";
import { planMonsterNames } from "../../utils/monsterNaming";
import { useGlobalContext } from "../../hooks/optionsContext";
import { useCombat } from "../BattleTracker/CombatContext";
import Icon from "../Icon";
import { checkboxStyle, checkboxVariant } from "../../utils/handArt";

interface MonsterManagerProps {
  onClose: () => void;
}

/** Shape of one row in the bundled bestiary JSON. */
type MonsterEntry = Pick<
  Monster,
  "name" | "link" | "hp" | "ac" | "str" | "dex" | "con" | "int" | "wis" | "cha" | "pp" | "init"
>;

/** Adding more than this at once is a typo, not an encounter. */
const MAX_DUPLICATES = 50;
/** Rendering every match of "a" meant ~1000 list items on one keystroke. */
const MAX_SUGGESTIONS = 20;

// The two bestiaries total ~690KB. They used to be static imports, so opening
// the manager pulled in both editions even though only one is ever in use.
// Fetched on demand instead, and cached so switching back is free.
const bestiaryCache: Partial<Record<"twentyFourteen" | "twentyTwentyFour", MonsterEntry[]>> = {};

async function loadBestiary(version: "twentyFourteen" | "twentyTwentyFour"): Promise<MonsterEntry[]> {
  const cached = bestiaryCache[version];
  if (cached) return cached;

  const mod =
    version === "twentyFourteen"
      ? await import("../../assets/2014monsters.json")
      : await import("../../assets/2024monsters.json");

  const data = (mod.default ?? mod) as MonsterEntry[];
  bestiaryCache[version] = data;
  return data;
}

const MonsterManager: React.FC<MonsterManagerProps> = ({ onClose }) => {
  const { monsters, setMonsters } = useMonsters();
  const { settings } = useGlobalContext();
  const { addMonsterToCombat, combatants } = useCombat();
  /* The same test the tracker itself uses for "a battle is running" —
     combatants exist (battleStage in BattleTracker). Before that there is no
     fight to join, and a live "Join the Fray" button said otherwise. */
  const battleRunning = combatants.length > 0;

  const [monstersData, setMonstersData] = useState<MonsterEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadBestiary(settings.version)
      .then((data) => {
        if (!cancelled) setMonstersData(data);
      })
      .catch((err) => console.error("Could not load the bestiary:", err));
    return () => {
      cancelled = true;
    };
  }, [settings.version]);

  const blankMonster = useMemo<Omit<Monster, "id">>(
    () => ({
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
      // Monsters join a battle from the Monster Manager, so a freshly added one
      // is ready by default. It used to default to false, which is why newly
      // added monsters silently sat out the next battle.
      present: true,
      conditions: [],
    }),
    []
  );

  const [newMonster, setNewMonster] = useState<Omit<Monster, "id">>(blankMonster);
  const [duplicateCount, setDuplicateCount] = useState(1);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleDuplicateCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    // Clamped: the old version had no upper bound, so a stray "999999" locked
    // the tab in the name-uniquing loop.
    setDuplicateCount(Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), MAX_DUPLICATES) : 1);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMonster({ ...newMonster, name: value });

    if (!value.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Ranked, not just filtered — see searchRank.ts. Typing "skeleton" used to
    // put Skeleton ninth because the list was in file order and cut off at the
    // first 20 hits.
    const matches = rankByName(
      monstersData,
      value,
      (m) => m.name,
      MAX_SUGGESTIONS,
    ).map((m) => m.name);

    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const handleSelectSuggestion = (name: string) => {
    const selected = monstersData.find((m) => m.name === name);
    if (selected) {
      setNewMonster({
        ...blankMonster,
        ...selected,
        currHp: selected.hp,
        maxHp: selected.hp,
      });
    }
    setShowSuggestions(false);
  };

  const addMonsters = (count: number) => {
    const baseName = newMonster.name.trim();
    if (!baseName) return;

    const howMany = Math.min(Math.max(count, 1), MAX_DUPLICATES);

    // See monsterNaming.ts: adding a second Goblin renumbers the first one, so
    // the pair reads "Goblin 1" and "Goblin 2".
    const plan = planMonsterNames(monsters.map((m) => m.name), baseName, howMany);

    const newMonsters: Monster[] = plan.newNames.map((name) => ({
      ...newMonster,
      id: crypto.randomUUID(),
      name,
    }));

    setMonsters((prev) => [
      ...prev.map((m) =>
        plan.renameFrom !== null && m.name === plan.renameFrom
          ? { ...m, name: plan.renameTo as string }
          : m,
      ),
      ...newMonsters,
    ]);
    setNewMonster(blankMonster);
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
      <button className="saveClose" id="mmSaveCloseButton" onClick={onClose}>X</button>
      <div className="monster-content">
      <h2>Monster Manager</h2>

      

        <div id="addMonsterOuter">
      <div className="nameInputWrapper">
        <input
          id="monsterNameInput"
          type="text"
          placeholder="Search"
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

      {/* One button, and a count beside it reading "Add Monster x 3". There
          used to be a second "Add Monsters" button here doing the same job
          with a different number, which is two controls for one decision. */}
      <div className="addMonsterRow">
        <button id="addNewMonsterButton" onClick={() => addMonsters(duplicateCount)}>
          Add Monster
        </button>
        <label className="addMonsterCount">
          <span className="addMonsterTimes" aria-hidden="true">&times;</span>
          <input
            type="number"
            min="1"
            max={MAX_DUPLICATES}
            value={duplicateCount}
            onChange={handleDuplicateCountChange}
            aria-label="How many to add"
          />
        </label>
      </div>
    </div>
    

      <div className="managerTableScroll">
      <table id="monsterManagerTable">
        <thead>
          <tr id="monsterManagerHeader">
            {/* Short labels: "Ready For Next Battle" wrapped to four lines and
                made the header taller than a monster's whole entry. The full
                wording stays as the tooltip. */}
            <th>Name</th>
            <th>HP</th>
            <th>AC</th>
            <th title="Hidden from the party">Hiding</th>
            <th title="Ready for the next battle">Ready</th>
            <th><span className="visuallyHidden">Actions</span></th>
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
                {/* Both booleans use the tracker's drawn box and tick, as the
                    Hero Manager's "Ready?" does. Pinned to a tick: a cross
                    against either of these would read as its opposite. */}
                {/* An eye rather than a box: open when the monster is in plain
                    sight, shut when it is hidden. Still a real checkbox, so it
                    is reachable by keyboard and reads as a toggle. */}
                <td className="managerCheckCell">
                  <label className="hidingToggle">
                    <input
                      type="checkbox"
                      checked={!!m.hidden}
                      onChange={() => toggleHidden(m.id)}
                      aria-label={`${m.name} is hidden from the party`}
                    />
                  </label>
                </td>
                <td className={`managerCheckCell ${checkboxVariant(m.id, "present", "Check")}`}>
                  <label className="managerCheck" style={checkboxStyle(m.id, "present")}>
                    <input
                      type="checkbox"
                      checked={!!m.present}
                      onChange={() => updateMonster(m.id, "present", !m.present)}
                      aria-label={`${m.name} is ready for the next battle`}
                    />
                    <span className="tickMark" aria-hidden="true" />
                  </label>
                </td>
                <td className="monsterActions">
                  {/* Only once a battle is running — hidden rather than
                      disabled, because a greyed button still reads as
                      something you could click. */}
                  {battleRunning && (
                    <button
                      className="buttonJoinFray"
                      onClick={async () => { await addMonsterToCombat(m); deleteMonster(m.id, true); }}
                    >
                      Join the Fray
                    </button>
                  )}
                  <button
                    className="buttonDelete"
                    onClick={() => deleteMonster(m.id)}
                    aria-label={`Delete ${m.name}`}
                  >
                    <Icon name="delete" color="currentColor" size={24} />
                  </button>
                </td>
              </tr>
              <tr className="statsRow">
                <td colSpan={6}>
                  <div className="heroStats">
                    {["str", "dex", "con", "int", "wis", "cha", "pp", "init"].map((stat) => (
                      <span className="heroStat" key={stat}>
                        <span className="heroStatLabel">{stat.toUpperCase()}</span>
                        <EditableCell entity={m} field={stat as keyof Monster} type="number" editingField={editingField} setEditingField={setEditingField} updateEntity={updateMonster} />
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </React.Fragment>
          ))}
          {monsters.length === 0 && (
            <tr className="monsterRosterEmpty">
              <td colSpan={6}>No monsters yet, try adding one.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      </div>
    </div>
  );
};

export default MonsterManager;
