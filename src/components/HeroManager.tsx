import { useState, useEffect } from "react";
import { getHeroes, storeHeroes } from './LocalStorage';
import { Hero } from "./Hero";
import AddHero from "./AddHero";


export default function HeroManager() {
  const [heroes, setHeroes] = useState<Hero[]>(() => {
    return getHeroes();
  });
  
  useEffect(() => {
    storeHeroes(heroes);
  }, [heroes]);

  const [editingField, setEditingField] = useState<string | null>(null);

  const addHero = (heroData: Omit<Hero, "id">) => {
    const newHero: Hero = {
      ...heroData,
      id: crypto.randomUUID()
    };
    setHeroes([...heroes, newHero]);
  };

  const updateHero = (heroId: string, field: keyof Hero, value: string | number | boolean) => {
    setHeroes(prevHeroes =>
      prevHeroes.map(hero =>
        hero.id === heroId
          ? { ...hero, [field]: value }
          : hero
      )
    );
  };
  
  const deleteHero = (heroId: string) => {
    const heroToDelete = heroes.find(hero => hero.id === heroId);
    const heroName = heroToDelete ? heroToDelete.name : 'this hero';
    
    if (confirm(`Do you really want to delete ${heroName}?`)) {
      setHeroes(prevHeroes => prevHeroes.filter(hero => hero.id !== heroId));
    }
  };

  const EditableCell = ({ hero, field, type = 'text' }: { 
    hero: Hero, 
    field: keyof Hero, 
    type?: 'text' | 'number' 
  }) => {
    const fieldKey = `${hero.id}-${field}`;
    const isEditing = editingField === fieldKey;
    const value = hero[field];

    if (isEditing && type === 'number') {
      return (
        <input
          type="number"
          value={value as number}
          onChange={(e) => updateHero(hero.id, field, Number(e.target.value))}
          onBlur={() => setEditingField(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditingField(null);
            }
          }}
          autoFocus
          style={{ width: '60px', padding: '2px', border: '1px solid #007bff' }}
        />
      );
    }

    if (isEditing && type === 'text') {
      return (
        <input
          type="text"
          value={value as string}
          onChange={(e) => updateHero(hero.id, field, e.target.value)}
          onBlur={() => setEditingField(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditingField(null);
            }
          }}
          autoFocus
          style={{ width: '100px', padding: '2px', border: '1px solid #007bff' }}
        />
      );
    }

    return (
      <span 
        onClick={() => setEditingField(fieldKey)}
        style={{ 
          cursor: 'pointer', 
          padding: '2px 4px',
          borderRadius: '2px',
        }}
        title="Click to edit"
      >
        {value}
      </span>
    );
  };

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
                  <EditableCell hero={hero} field="name" type="text" />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <EditableCell hero={hero} field="player" type="text" />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <EditableCell hero={hero} field="hp" type="number" />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <EditableCell hero={hero} field="ac" type="number" />
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
                    <span>STR: <EditableCell hero={hero} field="str" type="number" /></span>
                    <span>DEX: <EditableCell hero={hero} field="dex" type="number" /></span>
                    <span>CON: <EditableCell hero={hero} field="con" type="number" /></span>
                    <span>INT: <EditableCell hero={hero} field="int" type="number" /></span>
                    <span>WIS: <EditableCell hero={hero} field="wis" type="number" /></span>
                    <span>CHA: <EditableCell hero={hero} field="cha" type="number" /></span>
                    <span>PP: <EditableCell hero={hero} field="pp" type="number" /></span>
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