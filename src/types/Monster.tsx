import { DEVMODE } from "../utils/devmode";

export interface Monster {
  id: string;
  name: string;
  link: string;
  hp: number;
  ac: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  pp: number;
  init: number;
  hidden: boolean;
  present: boolean;
  conditions: string[];
}
