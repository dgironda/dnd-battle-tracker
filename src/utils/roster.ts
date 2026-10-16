import { Hero, Monster } from "../types/index";

/**
 * Fill in every field a Hero is expected to have. Older saves and imported
 * files predate some of them, and the UI assumes numbers rather than undefined.
 */
export function normalizeHero(h: Partial<Hero> & { id: string; name: string }): Hero {
  const hp = h.hp ?? 10;
  return {
    ...h,
    id: h.id,
    name: h.name,
    player: h.player ?? "",
    hp,
    ac: h.ac ?? 10,
    currHp: h.currHp ?? hp,
    maxHp: h.maxHp ?? hp,
    tHp: h.tHp ?? 0,
    str: h.str ?? 10,
    dex: h.dex ?? 10,
    con: h.con ?? 10,
    int: h.int ?? 10,
    wis: h.wis ?? 10,
    cha: h.cha ?? 10,
    pp: h.pp ?? 10,
    init: h.init ?? 0,
    conditions: h.conditions ?? [],
    present: h.present ?? true,
    link: h.link ?? "",
    notes: h.notes ?? "",
  };
}

/** Same idea for monsters. */
export function normalizeMonster(m: Partial<Monster> & { id: string; name: string }): Monster {
  const hp = m.hp ?? m.maxHp ?? 1;
  return {
    ...m,
    id: m.id,
    name: m.name,
    link: m.link ?? "",
    hp,
    maxHp: m.maxHp ?? hp,
    currHp: m.currHp ?? hp,
    ac: m.ac ?? 10,
    str: m.str ?? 10,
    dex: m.dex ?? 10,
    con: m.con ?? 10,
    int: m.int ?? 10,
    wis: m.wis ?? 10,
    cha: m.cha ?? 10,
    pp: m.pp ?? 0,
    init: m.init ?? 0,
    hidden: m.hidden ?? false,
    present: m.present ?? false,
    conditions: m.conditions ?? [],
  };
}
