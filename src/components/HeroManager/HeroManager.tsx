import React, { useMemo, useState } from "react";
import type { Hero } from "../../types/Hero";
import AddHero from "../HeroManager/AddHero";
import { createAddHero, createUpdateHero, createDeleteHero } from "../../utils/Utils";
import { EditableCell } from "../../utils/Utils";
import { useHeroes } from "../../hooks/useHeroes";
import Icon from "../Icon";
import { checkboxStyle, checkboxVariant } from "../../utils/handArt";
import { useCombat } from "../BattleTracker/CombatContext";

interface HeroManagerProps {
  onClose: () => void;
}

const HeroManager: React.FC<HeroManagerProps> = ({ onClose }) => {
  // Heroes come from the shared roster context — no private copy, no
  // write-back effect. Normalisation happens once in RosterProvider.
  const { heroes, setHeroes } = useHeroes();

  const [editingField, setEditingField] = useState<string | null>(null);
  const addHero = createAddHero(setHeroes);
  const updateHero = createUpdateHero(setHeroes);
  const deleteHero = createDeleteHero(heroes, setHeroes);
  const { addHeroToCombat, combatants } = useCombat();
  /* Who is already fighting, so the button can say so. */
  const inBattle = useMemo(() => new Set(combatants.map((c) => c.id)), [combatants]);
  /* The same test the tracker itself uses for "a battle is running" —
     combatants exist (battleStage in BattleTracker). Before that there is no
     fight to join, and a live "Join the Fray" button said otherwise. */
  const battleRunning = combatants.length > 0;

  return (
    <div id="heroAddManage">
      <button className="saveClose" id="hmSaveCloseButton" onClick={onClose}>X</button>
    <div className="hero-content">
      <h2>Hero Manager</h2>
      <AddHero onAddHero={addHero} />
      <div className="managerTableScroll">
      <table>
        <thead>
          <tr key="heroHeader" id="heroManagerHeader">
            <th>Name</th>
            <th>Player</th>
            <th>HP</th>
            <th>AC</th>
            <th>Ready?</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="heroTableBody">
          {heroes.map((hero, index) => (
            <React.Fragment key={hero.id}>
              <tr className="heroManagerHero">
                <td>
                  <EditableCell
                    entity={hero}
                    field="name"
                    type="text"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateEntity={updateHero}
                  />
                </td>
                <td>
                  <EditableCell
                    entity={hero}
                    field="player"
                    type="text"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateEntity={updateHero}
                  />
                </td>
                <td>
                  <EditableCell
                    entity={hero}
                    field="hp"
                    type="number"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateEntity={updateHero}
                  />
                </td>
                <td>
                  <EditableCell
                    entity={hero}
                    field="ac"
                    type="number"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateEntity={updateHero}
                  />
                </td>
                {/* The same drawn box and mark as the tracker's action
                    columns, rather than the ✅/❌ glyphs — a real checkbox, so
                    it is reachable by keyboard and reads as one control. The
                    mark is pinned to a tick: a cross against "Ready?" would
                    read as the opposite of what it means. */}
                <td className={`managerCheckCell ${checkboxVariant(hero.id, "present", "Check")}`}>
                  <label className="managerCheck" style={checkboxStyle(hero.id, "present")}>
                    <input
                      type="checkbox"
                      checked={!!hero.present}
                      onChange={() => updateHero(hero.id, "present", !hero.present)}
                      aria-label={`${hero.name} is ready`}
                    />
                    <span className="tickMark" aria-hidden="true" />
                  </label>
                </td>
                <td className="heroActions">
                  {/* The same control the Monster Manager has. A hero stays on
                      the roster afterwards — the party is a standing list —
                      so this reads "already in" once they are in the fight
                      rather than offering to add them twice.

                      Not rendered at all until a battle is running: hidden
                      rather than disabled, because a greyed button still
                      reads as something you could click. */}
                  {battleRunning && (
                    <button
                      className="buttonJoinFray"
                      disabled={inBattle.has(hero.id)}
                      title={
                        inBattle.has(hero.id)
                          ? `${hero.name} is already in the battle`
                          : `Add ${hero.name} to the battle`
                      }
                      onClick={() => addHeroToCombat(hero)}
                    >
                      {inBattle.has(hero.id) ? "In the Fray" : "Join the Fray"}
                    </button>
                  )}
                  <button
                    className="buttonDelete"
                    onClick={() => deleteHero(hero.id)}
                    aria-label={`Delete ${hero.name}`}
                  >
                    <Icon name="delete" color="currentColor" size={24} />
                  </button>
                </td>
              </tr>

              <tr key={`${hero.id}-stats`} className="statsRow">
                <td colSpan={6}>
                  <div className="heroStats">
                    {["str", "dex", "con", "int", "wis", "cha", "pp", "init"].map((stat) => (
                      <span className="heroStat" key={stat}>
                        <span className="heroStatLabel">{stat.toUpperCase()}</span>
                        <EditableCell
                          entity={hero}
                          field={stat as keyof Hero}
                          type="number"
                          editingField={editingField}
                          setEditingField={setEditingField}
                          updateEntity={updateHero}
                        />
                      </span>
                    ))}
                  </div>
                </td>
              </tr>

              {index < heroes.length - 1 && (
                <tr key={`${hero.id}-spacer`}>
                  <td colSpan={6} className="heroesSpacer"></td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {heroes.length === 0 && (
            <tr key="noHeroes">
              <td colSpan={6}>No heroes yet, try adding one.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
    </div>
  );
};

export default HeroManager;
