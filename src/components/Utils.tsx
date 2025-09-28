import { Dispatch, SetStateAction } from "react";
import { Hero } from "./Hero";

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

  if (isEditing && type === 'number') {
    return (
      <input
        type="number"
        value={value as number}
        onChange={(e) => updateEntity(entity.id, field, Number(e.target.value))}
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
        onChange={(e) => updateEntity(entity.id, field, e.target.value)}
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
      <span role="button" aria-label="Edit" className="edit">
        📝
      </span>
    </span>
  );
};