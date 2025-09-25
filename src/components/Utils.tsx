import { Dispatch, SetStateAction } from "react";
<<<<<<< HEAD
import { Hero, Monster, Combatant } from "../types/index";

=======
import { Hero } from "./Hero";
>>>>>>> dd4c093 (Moved addHero, updateHero, deleteHero, and EditableCell to a Utils.tsx file)

export const createAddHero = (setHeroes: Dispatch<SetStateAction<Hero[]>>) => {
  return (heroData: Omit<Hero, "id">) => {
    const newHero: Hero = {
      ...heroData,
      id: crypto.randomUUID()
    };
    setHeroes(prev => [...prev, newHero]);
  };
};

export const createUpdateHero = (setHeroes: Dispatch<SetStateAction<Hero[]>>) => {
  return (heroId: string, field: keyof Hero, value: string | number | boolean) => {
    setHeroes(prevHeroes =>
      prevHeroes.map(hero =>
        hero.id === heroId
          ? { ...hero, [field]: value }
          : hero
      )
    );
  };
};

export const createDeleteHero = (
  heroes: Hero[], 
  setHeroes: Dispatch<SetStateAction<Hero[]>>
) => {
  return (heroId: string) => {
    const heroToDelete = heroes.find(hero => hero.id === heroId);
    const heroName = heroToDelete ? heroToDelete.name : 'this hero';
    
    if (confirm(`Do you really want to delete ${heroName}?`)) {
      setHeroes(prevHeroes => prevHeroes.filter(hero => hero.id !== heroId));
    }
  };
};

<<<<<<< HEAD
// export const createAddMonster = (setMonsters: Dispatch<SetStateAction<Hero[]>>) => {
//   return (monsterData: Omit<Monster, "id">) => {
//     const newMonster: Monster = {
//       ...monsterData,
//       id: crypto.randomUUID()
//     };
//     setMonsters(prev => [...prev, newMonster]);
//   };
// };

export const createUpdateMonster = (setMonsters: Dispatch<SetStateAction<Monster[]>>) => {
  return (monsterId: string, field: keyof Monster, value: string | number | boolean) => {
    setMonsters(prevMonsters =>
      prevMonsters.map(monster =>
        monster.id === monsterId
          ? { ...monster, [field]: value }
          : monster
      )
    );
  };
};

export const createDeleteMonster = (
  monsters: Monster[], 
  setMonsters: Dispatch<SetStateAction<Monster[]>>
) => {
  return (monsterId: string) => {
    const monsterToDelete = monsters.find(monster => monster.id === monsterId);
    const monsterName = monsterToDelete ? monsterToDelete.name : 'this monster';
    
    if (confirm(`Do you really want to delete ${monsterName}?`)) {
      setMonsters(prevMonsters => prevMonsters.filter(monster => monster.id !== monsterId));
    }
  };
};

export const EditableCell = <T extends Record<string, any>>({
  entity,
  field,
  type = 'text',
  editingField,
  setEditingField,
  updateEntity
}: {
  entity: T;
  field: keyof T;
  type?: 'text' | 'number';
  editingField: string | null;
  setEditingField: Dispatch<SetStateAction<string | null>>;
  updateEntity: (entityId: string, field: keyof T, value: string | number | boolean) => void;
}) => {
  const fieldKey = `${entity.id}-${String(field)}`;
  const isEditing = editingField === fieldKey;
  const value = entity[field];
=======
export const EditableCell = ({ 
  hero, 
  field, 
  type = 'text',
  editingField,
  setEditingField,
  updateHero
}: { 
  hero: Hero;
  field: keyof Hero;
  type?: 'text' | 'number';
  editingField: string | null;
  setEditingField: Dispatch<SetStateAction<string | null>>;
  updateHero: (heroId: string, field: keyof Hero, value: string | number | boolean) => void;
}) => {
  const fieldKey = `${hero.id}-${field}`;
  const isEditing = editingField === fieldKey;
  const value = hero[field];
>>>>>>> dd4c093 (Moved addHero, updateHero, deleteHero, and EditableCell to a Utils.tsx file)

  if (isEditing && type === 'number') {
    return (
      <input
        type="number"
        value={value as number}
<<<<<<< HEAD
        onChange={(e) => updateEntity(entity.id, field, Number(e.target.value))}
=======
        onChange={(e) => updateHero(hero.id, field, Number(e.target.value))}
>>>>>>> dd4c093 (Moved addHero, updateHero, deleteHero, and EditableCell to a Utils.tsx file)
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
<<<<<<< HEAD
        onChange={(e) => updateEntity(entity.id, field, e.target.value)}
=======
        onChange={(e) => updateHero(hero.id, field, e.target.value)}
>>>>>>> dd4c093 (Moved addHero, updateHero, deleteHero, and EditableCell to a Utils.tsx file)
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
<<<<<<< HEAD
    <span
      onClick={() => setEditingField(fieldKey)}
      style={{
        cursor: 'pointer',
=======
    <span 
      onClick={() => setEditingField(fieldKey)}
      style={{ 
        cursor: 'pointer', 
>>>>>>> dd4c093 (Moved addHero, updateHero, deleteHero, and EditableCell to a Utils.tsx file)
        padding: '2px 4px',
        borderRadius: '2px',
      }}
      title="Click to edit"
    >
      {value}
<<<<<<< HEAD
      <span role="button" aria-label="Edit" className="edit">
        📝
      </span>
=======
>>>>>>> dd4c093 (Moved addHero, updateHero, deleteHero, and EditableCell to a Utils.tsx file)
    </span>
  );
};