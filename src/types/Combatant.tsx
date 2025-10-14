interface Combatant {
  id: string;
  name: string;
  link?: string;
  identity: 'hero' | 'monster';
  currHp: number;
  maxHp: number;
  action: boolean;
  bonus: boolean;
  move: boolean;
  reaction: boolean;
  conditions: string[];
  stats: string;
  init: number;
  initiative: number;
}

export {Combatant}