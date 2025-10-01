import React, { useState } from "react";
import HeroManager from "../components/HeroManager/HeroManager";
<<<<<<< HEAD
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
=======
import { Hero } from "../types/Hero";
import { Combatant } from "../types/Combatant";

function startBattle(heroes: Hero[]): Combatant[] {
  const combatants: Combatant[] = heroes
    .filter(hero => hero.present)
    .map(hero => {
      let initiative: number = 0;
      let validInput = false;
      
      while (!validInput) {
        const userInput = prompt(
          `Enter initiative for ${hero.name}:\n` +
          `(Enter a number, or type 'random' for 1-20, or Cancel for random)`
        );
        
        if (userInput === null || userInput.toLowerCase() === 'random') {
          initiative = Math.floor(Math.random() * 20) + 1;
          validInput = true;
        } else {
          const parsed = parseInt(userInput);
          if (!isNaN(parsed)) {
            initiative = parsed;
            validInput = true;
          }
        }
      }

      return {
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
      };
    });

  return combatants;
}

export {startBattle}
>>>>>>> 3757b41 (reorg is up and functional)
