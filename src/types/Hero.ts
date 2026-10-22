import type { Attack } from "./Attack";

interface Hero {
  id: string;
  name: string;
  player: string;
  hp: number;
  tHp: number;
  ac: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  pp: number;
  init: number;
  conditions: string[];
  present: boolean;
  maxHp: number;
  currHp: number;
  link: string;
  notes?: string;
  /** "Wizard", "Fighter"… set in dmOS; jFight draws the hero to match. */
  class?: string;
  /** Saved attacks, edited in dmOS's Hero Manager. */
  attacks?: Attack[];
}

export type { Hero }
