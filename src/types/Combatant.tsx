import { DEVMODE } from "../utils/devmode";

export interface Combatant {
  id: string;
  name: string;
  link: string;

  type: 'hero' | 'monster';

  currHp: number;
  maxHp: number;
  tHp: number;

  initiative: number;
  init: number;

  action: boolean;
  bonus: boolean;
  move: boolean;
  reaction: boolean;

  conditions: string[];
  deathsaves: boolean[];

  ac: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  pp: number;

  stats?: string;
  hp?: number;
}

