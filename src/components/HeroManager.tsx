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
    <div style={{ marginTop: '2rem' }}>
      <AddHero onAddHero={addHero} />
      
      <h2>Hero Manager</h2>
           
      
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Player</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>HP</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>AC</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Present</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((hero) => (
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
              </tr>
              
              <tr key={`${hero.id}-stats`} style={{ backgroundColor: '#f8f9fa' }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '12px' }}>
                  STR: <EditableCell hero={hero} field="str" type="number" />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '12px' }}>
                  DEX: <EditableCell hero={hero} field="dex" type="number" />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '12px' }}>
                  CON: <EditableCell hero={hero} field="con" type="number" />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '12px' }}>
                  INT: <EditableCell hero={hero} field="int" type="number" />
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '12px' }}>
                  WIS: <EditableCell hero={hero} field="wis" type="number" /> | 
                  CHA: <EditableCell hero={hero} field="cha" type="number" /> | 
                  PP: <EditableCell hero={hero} field="pp" type="number" />
                </td>
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}