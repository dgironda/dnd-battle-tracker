import { DEVMODE } from "../utils/devmode";

interface Combatant {
  id: string;
  name: string;
  link?: string;
  type: 'hero' | 'monster';
  currHp: number;
  maxHp: number;
  tHp: number;
  action: boolean;
  bonus: boolean;
  move: boolean;
  reaction: boolean;
  conditions: string[];
  stats: string;
  init: number;
  initiative: number;
  deathsaves: boolean[];
}

export {Combatant}
