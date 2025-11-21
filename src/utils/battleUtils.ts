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
	tHp: hero.tHp,

	initiative: initiative,
	init: initiative,

	ac: hero.ac,
	str: hero.str,
	dex: hero.dex,
	con: hero.con,
	int: hero.int,
	wis: hero.wis,
	cha: hero.cha,
	pp: hero.pp,

	deathsaves: [],
	action: false,
	bonus: false,
	move: false,
	reaction: false,
	conditions: [],

	stats: `Strength: ${hero.str}
		Dexterity: ${hero.dex}
		Constitution: ${hero.con}
		Intelligence: ${hero.int}
		Wisdom: ${hero.wis}
		Charisma: ${hero.cha}
		Passive Perception: ${hero.pp}`,

	link: ""
	});

  }


  
  return combatants;
}