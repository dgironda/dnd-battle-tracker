import React, { useState } from "react";
import HeroManager from "./HeroManager/HeroManager";
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
