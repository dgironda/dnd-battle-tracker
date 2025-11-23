import { DEVMODE } from "../utils/devmode";

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
}

export {Hero}
