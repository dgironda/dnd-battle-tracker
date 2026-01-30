import { DEVMODE } from "../utils/devmode";

import { Dispatch, SetStateAction } from "react";
import { Hero, Monster, Combatant } from "../types/index";
import { useEffect, useState } from "react";
import { getHeroes, storeHeroes, getMonsters, storeMonsters } from "../utils/LocalStorage";


export const createAddHero = (setHeroes: Dispatch<SetStateAction<Hero[]>>) => {
  return (heroData: Omit<Hero, "id">) => {
    const newHero: Hero = {
      ...heroData,
      id: crypto.randomUUID()
    };
    setHeroes(prev => [...prev, newHero]);
  };
};

// export const createUpdateHero = (setHeroes: Dispatch<SetStateAction<Hero[]>>) => {
//   return (heroId: string, field: keyof Hero, value: string | number | boolean | string[]) => {
//     setHeroes(prevHeroes =>
//       prevHeroes.map(hero =>
//         hero.id === heroId
//           ? {
//               ...hero,
//               [field]:
//                 field === "conditions" && Array.isArray(value)
//                   ? value
//                   : typeof value === "number" && !isNaN(value)
//                   ? Number(value)
//                   : value,
//             }
//           : hero
//       )
//     );
//   };
// };

export const createUpdateHero = (setHeroes: Dispatch<SetStateAction<Hero[]>>) => {
  return (heroId: string, field: keyof Hero, value: string | number | boolean | string[]) => {
    setHeroes(prevHeroes => {
      const newHeroes = prevHeroes.map(hero =>
        hero.id === heroId
          ? {
              ...hero,
              [field]:
                field === "conditions" && Array.isArray(value)
                  ? value
                  : typeof value === "number" && !isNaN(value)
                  ? Number(value)
                  : value,
            }
          : hero
      );

      // Store the new heroes if necessary, 
      // since you can't return the 'newHeroes' directly here
      storeHeroes(newHeroes);
      return newHeroes; // Return the updated heroes for the state
    });
  };
};



export const createDeleteHero = (
  heroes: Hero[], 
  setHeroes: Dispatch<SetStateAction<Hero[]>>
) => {
  return (heroId: string) => {
    const currentHeroes = getHeroes();
    const heroToDelete = heroes.find(hero => hero.id === heroId);
    const heroName = heroToDelete ? heroToDelete.name : 'this hero';
    
    if (confirm(`Do you really want to delete ${heroName}?`)) {
      const updatedHeroes = currentHeroes.filter(hero => hero.id !== heroId);
      // setHeroes(prevHeroes => prevHeroes.filter(hero => hero.id !== heroId));

      try {
        localStorage.setItem("storedHeroes", JSON.stringify(updatedHeroes));
      } catch (error) {
        console.error("Error saving heroes:", error);
      }
      setHeroes(updatedHeroes)
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

// export const createDeleteMonster = (
//   monsters: Monster[], 
//   setMonsters: Dispatch<SetStateAction<Monster[]>>
// ) => {
//   return (monsterId: string, skipPrompt = false) => {
//     const monsterToDelete = monsters.find(monster => monster.id === monsterId);
//     const monsterName = monsterToDelete ? monsterToDelete.name : 'this monster';
    
//     if (skipPrompt || confirm(`Do you really want to delete ${monsterName}?`)) {
//       setMonsters(prevMonsters => prevMonsters.filter(monster => monster.id !== monsterId));
//     }
//   };
// };

export const createDeleteMonster = (
  monsters: Monster[], 
  setMonsters: Dispatch<SetStateAction<Monster[]>>
) => {
  return (monsterId: string, skipPrompt = false) => {
    const currentMonsters = getMonsters(); // Get fresh data from localStorage
    const monsterToDelete = currentMonsters.find(monster => monster.id === monsterId);
    const monsterName = monsterToDelete ? monsterToDelete.name : 'this monster';
    
    if (skipPrompt || confirm(`Do you really want to delete ${monsterName}?`)) {
      const updatedMonsters = currentMonsters.filter(monster => monster.id !== monsterId);
      
      // Update localStorage
      try {
        localStorage.setItem("storedMonsters", JSON.stringify(updatedMonsters));
      } catch (error) {
        console.error("Error saving monsters:", error);
      }
      
      // Update state
      setMonsters(updatedMonsters);
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
  type?: 'text' | 'number' | 'textarea';
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
        className="editableCellNum"
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
        className="editableCellTxt"
      />
    );
  }

  if (isEditing && type === 'textarea') {
    return (
      <textarea
        value={inputValue as string}
        onChange={(e) => {
          setInputValue(e.target.value as any);
          updateEntity(entity.id, field, e.target.value);
        }}
        onBlur={() => setEditingField(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.shiftKey) {
            // Allow Shift+Enter for new lines
            return;
          }
          if (e.key === 'Escape') {
            setEditingField(null);
          }
        }}
        autoFocus
        className="editableCellTextarea"
        rows={4}
      />
    );
  }

  return (
    <span
      onClick={() => setEditingField(fieldKey)}
      className="setEditingField"
      title="Click to edit"
    >
      {inputValue}
      <span role="button" aria-label="Edit" className="edit">
        📝
      </span>
    </span>
  );
};
