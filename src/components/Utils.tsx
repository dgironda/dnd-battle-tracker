import { Dispatch, SetStateAction } from "react";
import { Hero, Monster, Combatant } from "../types/index";
import { useEffect, useState } from "react";


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
  return (monsterId: string, skipPrompt = false) => {
    const monsterToDelete = monsters.find(monster => monster.id === monsterId);
    const monsterName = monsterToDelete ? monsterToDelete.name : 'this monster';
    
    if (skipPrompt || confirm(`Do you really want to delete ${monsterName}?`)) {
      setMonsters(prevMonsters => prevMonsters.filter(monster => monster.id !== monsterId));
    }
  };
};

export const createUpdateCombatant = (setCombatants: Dispatch<SetStateAction<Combatant[]>>) => {
  return (combatantId: string, field: keyof Combatant, value: string | number | boolean) => {
    setCombatants(prevCombatants =>
      prevCombatants.map(combatant =>
        combatant.id === combatantId
          ? { ...combatant, [field]: value }
          : combatant
      )
    );
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
  updateEntity: (entityId: string, field: keyof T, value: string | number ) => void;
}) => {
  const fieldKey = `${entity.id}-${String(field)}`;
  const isEditing = editingField === fieldKey;
  const [inputValue, setInputValue] = useState(entity[field]);
  useEffect(() => {
        setInputValue(entity[field]);
    }, [entity[field]]);

  if (isEditing && type === 'number') {

    return (
      <input
        type="number"
        value={inputValue}
        onChange={(e) => {
                    const newValue = Number(e.target.value);
                    if (!isNaN(newValue)) {
                        setInputValue(newValue as any);  // Update local state
                        updateEntity(entity.id, field, newValue);  // Push update
                    }
                }}
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
        value={inputValue as string}
        onChange={(e) => {
                    setInputValue(e.target.value as any); // Type assertion
                    updateEntity(entity.id, field, e.target.value);
                }}
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
      {inputValue}
      <span role="button" aria-label="Edit" className="edit">
        📝
      </span>
    </span>
  );
};