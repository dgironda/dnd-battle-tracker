import React from 'react';
import { useState } from 'react';
import { EditableCell, createUpdateHero, createUpdateMonster } from '../../utils/Utils';
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
  // Both rosters come from the shared context, so this dialog always shows the
  // same data the managers do. It used to keep a private normalised copy and
  // re-read storage whenever it opened.
  const { heroes, setHeroes } = useHeroes();
  const { monsters, setMonsters } = useMonsters();
  const updateHero = createUpdateHero(setHeroes);
  const updateMonster = createUpdateMonster(setMonsters);
  const [editingField, setEditingField] = useState<string | null>(null);

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