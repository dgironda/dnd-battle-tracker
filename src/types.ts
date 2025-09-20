export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  maxHP: number;
  currentHP: number;
  AC: number;
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
  PP: number;
  actionBonus: number;
  move: number;
  conditions: string[];
  concentrating: boolean;
  reactionUsed: boolean;
}
