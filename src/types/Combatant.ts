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
  /**
   * The round each held condition began in, keyed by its name — so the tracker
   * can say "raging, 3 rounds". Optional: a battle saved before this existed
   * has none, and those start counting when it is next loaded. Maintained in
   * one place, by stampConditionRounds; see utils/conditionRounds.ts.
   */
  conditionSince?: Record<string, number>;
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
  notes?: string;
}

