import type { Combatant } from "../types/index";

/**
 * The fight's order, and keeping the turn on the right person when that order
 * changes underneath it.
 *
 * The turn is a position in the initiative-sorted list (`currentTurnIndex`),
 * not a person. So anything that moves rows around in the middle of a round
 * (a total corrected, someone joining the fight) has to move the position
 * with them, or the turn quietly lands on whoever slid into that slot.
 */

/** Highest initiative first. Array.sort is stable, so a tie keeps the order the fight stores them in. */
export const byInitiative = (a: Combatant, b: Combatant) => b.initiative - a.initiative;

/** Whether they have had their turn this round: Action, Bonus and Move all ticked. */
export const hasActed = (c: Combatant) => c.action && c.bonus && c.move;

/**
 * Where the turn belongs once the fight has changed from `before` to `after`:
 * on whoever was acting, wherever the change has moved them. If they are not
 * in `after` at all, the position is left where it was for the caller to deal
 * with, as taking someone out of the fight does.
 */
export function followTurn(
  before: readonly Combatant[],
  turnIndex: number,
  after: readonly Combatant[],
): number {
  const acting = [...before].sort(byInitiative)[turnIndex];
  if (!acting) return turnIndex;
  const moved = [...after].sort(byInitiative).findIndex((c) => c.id === acting.id);
  return moved === -1 ? turnIndex : moved;
}
