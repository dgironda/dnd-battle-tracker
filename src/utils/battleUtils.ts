import React, { useState } from "react";
import HeroManager from "../components/HeroManager/HeroManager";
import MonsterManager from "../components/MonsterManager/MonsterManager";
import { Hero, Monster, Combatant } from "../types/index";

export async function startBattle(
  heroes: Hero[], 
  renderDialog: (heroName: string) => Promise<number>
): Promise<Combatant[]> {
  const combatants: Combatant[] = [];
  
  for (const hero of heroes.filter(h => h.present)) {
    const initiative = await renderDialog(hero.name);
    
    combatants.push({
      id: hero.id,
      name: hero.name,
      type: 'hero',
      currHp: hero.hp,
      maxHp: hero.hp,
      initiative: initiative,
	  init: initiative,
      deathsaves: [],
      action: false,
      bonus: false,
      move: false,
      reaction: false,
      conditions: [],
      stats: `Strength: ${hero.str}\nDexterity: ${hero.dex}\nConstitution: ${hero.con}\nIntelligence: ${hero.int}\nWisdom: ${hero.wis}\nCharisma: ${hero.cha}\nPassive Perception: ${hero.pp}`,
	  link: ""
    });
  }


  
  return combatants;
}