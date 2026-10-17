/**
 * One way a creature hurts something: a sword swing, a fire bolt.
 *
 * Edited in dmOS (heroes in its Hero Manager, monsters in its Bestiary) and
 * kept here, so BattleTracker stays the one place the party lives. dmOS's
 * jFight reads them to resolve attacks.
 */
export interface DamagePart {
  /** Dice and modifier, e.g. "1d8+3". */
  dice: string;
  /** "slashing", "fire"… free text. */
  type: string;
}

export interface Attack {
  id: string;
  name: string;
  /** Added to the d20 attack roll. */
  toHit: number;
  damage: DamagePart[];
}
