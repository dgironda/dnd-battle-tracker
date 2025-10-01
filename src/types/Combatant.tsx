interface Combatant {
  id: string;
  name: string;
  initiative: number;
  currHp: number;
  maxHp: number;
  action: boolean;
  bonus: boolean;
  move: boolean;
  reaction: boolean;
  conditions: string[];

}

export {Combatant}