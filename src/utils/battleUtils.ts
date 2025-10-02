import React, { useState } from "react";
import HeroManager from "../components/HeroManager/HeroManager";
import { Hero } from "../types/Hero";
import { Combatant } from "../types/Combatant";

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
      currHp: hero.hp,
      maxHp: hero.hp,
      initiative: initiative,
      action: false,
      bonus: false,
      move: false,
      reaction: false,
      conditions: []
    });
  }
  
  return combatants;
}