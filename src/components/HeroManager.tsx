import { useState, useEffect } from "react";
import { getHeroes, storeHeroes } from './LocalStorage';
import { Hero } from "./Hero";
import AddHero from "./AddHero";
import { createAddHero, createUpdateHero, createDeleteHero, EditableCell } from "./Utils";

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
      
      <h2>Hero Manager <sup>(Click to edit)</sup></h2>
      
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Player</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>HP</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>AC</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Present</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody className="heroTableBody">
          {heroes.map((hero, index) => (
            <>
              <tr key={hero.id}>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <EditableCell 
                    hero={hero} 
                    field="name" 
                    type="text"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateHero={updateHero}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <EditableCell 
                    hero={hero} 
                    field="player" 
                    type="text"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateHero={updateHero}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <EditableCell 
                    hero={hero} 
                    field="hp" 
                    type="number"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateHero={updateHero}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <EditableCell 
                    hero={hero} 
                    field="ac" 
                    type="number"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateHero={updateHero}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <span
                    onClick={() => updateHero(hero.id, 'present', !hero.present)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    {hero.present ? "✅" : "❌"}
                  </span>
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <button className="buttonDelete"
                    onClick={() => deleteHero(hero.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
              
              <tr key={`${hero.id}-stats`} style={{ backgroundColor: '#f8f9fa' }}>
                <td 
                  colSpan={6} 
                  style={{ 
                    border: '1px solid #ccc', 
                    padding: '8px', 
                    fontSize: '12px'
                  }}
                >
                  <div className="heroStats">
                    <span>STR: <EditableCell 
                      hero={hero} 
                      field="str" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateHero={updateHero}
                    /></span>
                    <span>DEX: <EditableCell 
                      hero={hero} 
                      field="dex" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateHero={updateHero}
                    /></span>
                    <span>CON: <EditableCell 
                      hero={hero} 
                      field="con" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateHero={updateHero}
                    /></span>
                    <span>INT: <EditableCell 
                      hero={hero} 
                      field="int" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateHero={updateHero}
                    /></span>
                    <span>WIS: <EditableCell 
                      hero={hero} 
                      field="wis" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateHero={updateHero}
                    /></span>
                    <span>CHA: <EditableCell 
                      hero={hero} 
                      field="cha" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateHero={updateHero}
                    /></span>
                    <span>PP: <EditableCell 
                      hero={hero} 
                      field="pp" 
                      type="number"
                      editingField={editingField}
                      setEditingField={setEditingField}
                      updateHero={updateHero}
                    /></span>
                  </div>
                </td>
              </tr>
              
              {index < heroes.length - 1 && (
                <tr key={`${hero.id}-spacer`}>
                  <td colSpan={6} style={{ height: '8px', border: 'none', backgroundColor: 'transparent' }}></td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}