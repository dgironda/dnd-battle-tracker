import React from 'react';
import { useState, useEffect } from 'react';
import { getHeroes, getMonsters } from '../../utils/LocalStorage';
import { EditableCell, createUpdateHero, createUpdateMonster } from '../../utils/Utils';
import { Hero, Monster } from '../../types';
import { useHeroes } from '../../hooks/useHeroes';
import { useMonsters } from '../../hooks/useMonsters';

interface PopupProps
{
  isOpen: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

const SBPopup: React.FC<PopupProps> = ({
  isOpen,
  onCancel,
  onContinue,
}) =>
{
  const [heroes, setHeroes] = useState<Hero[]>(() =>
  {
    const savedHeroes = getHeroes();
    // Ensure all numeric fields are numbers
    return savedHeroes.map(h => ({
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

  const updateHero = createUpdateHero(setHeroes);
  const { monsters, setMonsters } = useMonsters();
  const updateMonster = createUpdateMonster(setMonsters);
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() =>
  {
    if (isOpen) {
      const savedHeroes = getHeroes();
      setHeroes(savedHeroes.map(h => ({
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
      })));
      setMonsters(getMonsters());
    }
  }, [isOpen, setMonsters]);

  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-backdrop" onClick={onCancel} />

      <div className="popup-container">
        <h3 className="popup-title">Confirm Battle Start</h3>

        <p className="popup-message">Are you sure you want to start a new battle? Your previous one will be lost.</p>
        <p className="popup-message">All Heroes and Monsters marked Ready will join the battle. <br />You can edit their ready status and initiative bonus as needed.</p>
        <div id='preBattleCombatants'>
          <table>
            <thead>
              <tr>
                <th colSpan={3}>Heroes</th>
              </tr>
              {heroes.length > 0 && (
                <tr>
                  <th>Name</th>
                  <th>Ready For Battle</th>
                  <th>Initiative Bonus</th>
                </tr>
              )}
            </thead>
            <tbody>
              {heroes.map((hero) => (
                <tr key={hero.id}>
                  <td>
                    {hero.name}
                  </td>
                  <td>
                    <span onClick={() => updateHero(hero.id, "present", !hero.present)}
                      className="pointer">{hero.present ? "✅" : "❌"}</span>
                  </td>
                  <td>
                    <EditableCell
                      entity={hero}
                      field='init'
                      type='number'
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    />
                  </td>
                </tr>
              ))}
            </tbody>

            <thead>
              <tr>
                <th colSpan={3}>Monsters</th>
              </tr>
              {monsters.length > 0 && (
                <tr>
                  <th>Name</th>
                  <th>Ready For Battle</th>
                  <th>Initiative Bonus</th>
                </tr>
              )}
            </thead>
            <tbody>
              {monsters.map((monster) => (
                <tr key={monster.id}>
                  <td>
                    {monster.name}
                  </td>
                  <td>
                    <span onClick={() => updateMonster(monster.id, "present", !monster.present)}
                      className="pointer">{monster.present ? "✅" : "❌"}</span>
                  </td>
                  <td>
                    <EditableCell
                      entity={monster}
                      field='init'
                      type='number'
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateMonster}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="popup-buttons">
          <button onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
          <button onClick={onContinue} className="btn-continue">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SBPopup