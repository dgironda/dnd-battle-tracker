interface Combatant {
  id: string;
  name: string;
<<<<<<< HEAD
  link?: string;
  type: 'hero' | 'monster';
=======
  initiative: number;
>>>>>>> 3757b41 (reorg is up and functional)
  currHp: number;
  maxHp: number;
  action: boolean;
  bonus: boolean;
  move: boolean;
  reaction: boolean;
  conditions: string[];
<<<<<<< HEAD
  stats: string;
  init: number;
  initiative: number;
=======

>>>>>>> 3757b41 (reorg is up and functional)
}

export {Combatant}