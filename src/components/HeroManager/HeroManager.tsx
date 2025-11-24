import React, { useState, useEffect } from "react";
import { DEVMODE } from "../../utils/devmode";
import { getHeroes, storeHeroes } from "../../utils/LocalStorage";
import { Hero } from "../../types/Hero";
import AddHero from "../HeroManager/AddHero";
import { createAddHero, createUpdateHero, createDeleteHero } from "../Utils";
import { EditableCell } from "../../utils/editableCell";

interface HeroManagerProps {
  onClose: () => void;
}

const HeroManager: React.FC<HeroManagerProps> = ({ onClose }) => {
  const [heroes, setHeroes] = useState<Hero[]>(() => {
    const saved = getHeroes();
    // Ensure all numeric fields are numbers
    return saved.map(h => ({
      ...h,
      hp: h.hp ?? 10,
      ac: h.ac ?? 10,
      currHp: h.currHp ?? h.hp ?? 10,
      maxHp: h.maxHp ?? h.hp ?? 10,
      tHp: h.tHp ?? 0,
      str: h.str ?? 10,
      dex: h.dex ?? 10,
      con: h.con ?? 10,
      int: h.int ?? 10,
      wis: h.wis ?? 10,
      cha: h.cha ?? 10,
      pp: h.pp ?? 0,
      init: h.init ?? 0,
      conditions: h.conditions ?? [],
      present: h.present ?? true,
      link: h.link ?? "",
      notes: h.notes ?? "",
    }));
  });

  useEffect(() => {
    storeHeroes(heroes);
  }, [heroes]);

  const [editingField, setEditingField] = useState<string | null>(null);
  const addHero = createAddHero(setHeroes);
  const updateHero = createUpdateHero(setHeroes);
  const deleteHero = createDeleteHero(heroes, setHeroes);

  return (
    <div id="heroAddManage">
      <AddHero onAddHero={addHero} />
      <h2>Hero Manager</h2>

      <table>
        <thead>
          <tr key="heroHeader" id="heroManagerHeader">
            <th>Name</th>
            <th>Player</th>
            <th>HP</th>
            <th>AC</th>
            <th>Present</th>
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
                <td
                  onClick={() => updateHero(hero.id, "present", !hero.present)}
                  className="pointer"
                >
                  {hero.present ? "✅" : "❌"}
                </td>
                <td>
                  <button className="buttonDelete" onClick={() => deleteHero(hero.id)}>
                    Delete
                  </button>
                </td>
              </tr>

              <tr key={`${hero.id}-stats`} className="statsRow">
                <td colSpan={6}>
                  <div className="heroStats">
                    {["str", "dex", "con", "int", "wis", "cha", "pp", "init"].map((stat) => (
                      <span key={stat} title={stat.toUpperCase()}>
                        {stat.toUpperCase()}:{" "}
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

      <p className="saveClose">
        <button onClick={onClose}>Save and Close</button>
      </p>
    </div>
  );
};

export default HeroManager;
