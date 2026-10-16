import type { Combatant, Monster } from "../types/index";

/**
 * A monster as it enters a fight: at full health, nothing spent, and on the
 * initiative it rolled.
 *
 * Starting a battle and adding a monster to one already running both build
 * this, and used to do it in two identical copies. (Heroes are built in two
 * different ways on purpose: joining a fight keeps a hero's current hit points
 * and conditions, starting a battle does not.)
 */
export function monsterCombatant(monster: Monster, initiative: number): Combatant {
  return {
    id: monster.id,
    name: monster.name,
    link: monster.link,
    type: "monster",
    currHp: monster.hp,
    maxHp: monster.hp,
    tHp: 0,
    initiative,
    action: false,
    bonus: false,
    move: false,
    reaction: false,
    conditions: monster.conditions ?? [],
    init: monster.init,
    deathsaves: [],
    ac: monster.ac,
    str: monster.str,
    dex: monster.dex,
    con: monster.con,
    int: monster.int,
    wis: monster.wis,
    cha: monster.cha,
    pp: monster.pp,
  };
}
