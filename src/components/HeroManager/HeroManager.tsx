import { useState, useEffect } from "react";
import { getHeroes, storeHeroes } from '../../utils/LocalStorage';
import { Hero } from "../../types/Hero";
import AddHero from "../HeroManager/AddHero";
import { createAddHero, createUpdateHero, createDeleteHero } from "../Utils";
import { EditableCell } from "../../utils/editableCell";




export default function HeroManager() {
  const [heroes, setHeroes] = useState<Hero[]>(() => {
    return getHeroes();
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
          <tr key="heroHeader">
            <th>Name</th>
            <th>Player</th>
            <th>HP</th>
            <th>AC</th>
            <th>Present</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className="heroTableBody">
          {heroes.map((hero, index) => (
            <>
              <tr key={hero.id}>
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
                <td>
                  <span
                    onClick={() => updateHero(hero.id, 'present', !hero.present)}
                    className="pointer"
                    title="Click to toggle"
                  >
                    {hero.present ? "✅" : "❌"}
                  </span>
                </td>
                <td>
                  <button className="buttonDelete"
                    onClick={() => deleteHero(hero.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
              
              <tr key={`${hero.id}-stats`} className="statsRow">
                <td 
                  colSpan={6}
                >
                  <div className="heroStats">
                    <span title="Strength">STR: <EditableCell 
                      entity={hero} 
                      field="str" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                    <span title="Dexterity">DEX: <EditableCell 
                      entity={hero} 
                      field="dex" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                    <span title="Constitution">CON: <EditableCell 
                      entity={hero} 
                      field="con" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                    <span title="Intelligence">INT: <EditableCell 
                      entity={hero} 
                      field="int" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                    <span title="Wisdom">WIS: <EditableCell 
                      entity={hero} 
                      field="wis" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                    <span title="Charisma">CHA: <EditableCell 
                      entity={hero} 
                      field="cha" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                    <span title="Passive Perception">PP: <EditableCell 
                      entity={hero} 
                      field="pp" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                    <span title="Initiative Bonus">Init: <EditableCell 
                      entity={hero} 
                      field="init" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateEntity={updateHero}
                    /></span>
                  </div>
                </td>
              </tr>
              
              {/* what is this below with the key hero.id-spacer? */}
              {index < heroes.length - 1 && (
                <tr key={`${hero.id}-spacer`}>
                  <td colSpan={6} className="heroesSpacer">
                  </td>
                </tr>
              )}
            </>
          ))}
                    {heroes.length === 0 && (
            <tr key={"noHeroes"}>
              <td colSpan={6} id="noHeroes">
                No heroes yet, try adding one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}