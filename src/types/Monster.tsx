export interface Monster {
<<<<<<< HEAD
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
=======
  id: number;
  name: string;
  hp: number;
  ac: number;
  hidden: boolean;
>>>>>>> 3757b41 (reorg is up and functional)
  conditions: string[];
}
