interface Combatant {
  id: string;
  name: string;
  type: 'hero' | 'monster';
  initiative: number;
  currHp: number;
  maxHp: number;
  action: boolean;
  bonus: boolean;
  move: boolean;
  reaction: boolean;
  conditions: string[];
  stats: string;
  init: number;
}

export {Combatant}