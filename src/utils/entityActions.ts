import { Dispatch, SetStateAction } from "react";
import { Hero, Monster, Combatant } from "../types/index";
import { confirmDialog } from "./notify";

export const createAddHero = (setHeroes: Dispatch<SetStateAction<Hero[]>>) =>
{
  return (heroData: Omit<Hero, "id">) =>
  {
    const newHero: Hero = {
      ...heroData,
      id: crypto.randomUUID()
    };
    setHeroes(prev => [...prev, newHero]);
  };
};

export const createUpdateHero = (setHeroes: Dispatch<SetStateAction<Hero[]>>) =>
{
  return (heroId: string, field: keyof Hero, value: string | number | boolean | string[]) =>
  {
    // Note: no localStorage write in here. State updaters must be pure —
    // React invokes them twice under StrictMode — and persistence is already
    // handled by the effect in RosterProvider.
    setHeroes(prevHeroes =>
      prevHeroes.map(hero =>
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
      )
    );
  };
};

export const createDeleteHero = (
  heroes: Hero[],
  setHeroes: Dispatch<SetStateAction<Hero[]>>
) =>
{
  return async (heroId: string) =>
  {
    const heroToDelete = heroes.find(hero => hero.id === heroId);
    const heroName = heroToDelete ? heroToDelete.name : 'this hero';

    const ok = await confirmDialog(`Delete ${heroName}? This can't be undone.`, {
      title: "Delete hero",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    setHeroes(prevHeroes => prevHeroes.filter(hero => hero.id !== heroId));
  };
};

export const createUpdateMonster = (setMonsters: Dispatch<SetStateAction<Monster[]>>) =>
{
  return (monsterId: string, field: keyof Monster, value: string | number | boolean) =>
  {
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
) =>
{
  return async (monsterId: string, skipPrompt = false) =>
  {
    const monsterToDelete = monsters.find(monster => monster.id === monsterId);
    const monsterName = monsterToDelete ? monsterToDelete.name : 'this monster';

    if (!skipPrompt) {
      const ok = await confirmDialog(`Delete ${monsterName}? This can't be undone.`, {
        title: "Delete monster",
        tone: "danger",
        confirmLabel: "Delete",
      });
      if (!ok) return;
    }

    setMonsters(prevMonsters => prevMonsters.filter(monster => monster.id !== monsterId));
  };
};

export const createUpdateCombatant = (setCombatants: Dispatch<SetStateAction<Combatant[]>>) =>
{
  return (combatantId: string, field: keyof Combatant, value: string | number | boolean) =>
  {
    setCombatants(prevCombatants =>
      prevCombatants.map(combatant =>
        combatant.id === combatantId
          ? { ...combatant, [field]: value }
          : combatant
      )
    );
  };
};
