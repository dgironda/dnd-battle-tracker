import React, { useState } from "react";
import type { Hero } from "../../types/Hero";
import AddHero from "../HeroManager/AddHero";
import { createAddHero, createUpdateHero, createDeleteHero } from "../../utils/Utils";
import { EditableCell } from "../../utils/Utils";
import { useHeroes } from "../../hooks/useHeroes";
import Icon from "../Icon";
import { checkboxStyle, checkboxVariant } from "../../utils/handArt";

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
                <td>
                  <button className="buttonDelete" onClick={() => deleteHero(hero.id)}>
                    <Icon
                      name="delete"
                      color="var(--color-bg1)"
                      size={24}
                      />
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
