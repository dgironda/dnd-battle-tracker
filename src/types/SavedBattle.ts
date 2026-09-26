import type { Combatant } from './Combatant';
import type { Hero } from './Hero';
import type { Monster } from './Monster';

/** A battle saved from the Battle Manager, to be picked up again later. */
export interface SavedBattle {
  id: string;
  name: string;
  savedDate: string;
  combatants: Combatant[];
  roundNumber: number;
  currentTurnIndex: number;
  /**
   * Legacy: the photo as a base64 data URL, inline. Read on load and moved
   * into IndexedDB — see photoStore for why keeping it here was so expensive.
   * Never written any more.
   */
  photo?: string;
  /** Key into the IndexedDB photo store. */
  photoId?: string;
}

/** A backup file, as Download everything writes it and Load a backup reads it. */
export interface ExportedData {
  _header: Record<string, string>;
  heroes: Hero[];
  monsters: Monster[];
  combatants: Combatant[];
  round: number;
  currentTurnIndex: number;
  battles: SavedBattle[];
}
