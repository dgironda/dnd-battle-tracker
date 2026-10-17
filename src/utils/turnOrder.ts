import type { Combatant } from "../types/index";
import { READIED_CONDITION } from "../constants/Conditions";

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
 * Who goes next once the turn at `current` ends, in the initiative-sorted
 * fight, and whether the round turns over. Null when everyone is dead.
 *
 * The turn goes to whoever is first in initiative order and has not had their
 * turn this round. Nearly always that is simply the next one down, since
 * everyone above has acted. It is somebody higher up only when they joined the
 * fight, or had their total corrected, after their place in the order had gone
 * by: they go as soon as the turn in progress ends, rather than cutting into it
 * or losing the round. The one acting now is left out by position, since the HP
 * window can end a turn before its boxes are ticked. When nobody is waiting,
 * the round turns over.
 *
 * Shared by the tracker's Next Turn and the dmOS bridge's endTurn, so a turn
 * ended from jFight goes exactly where one ended here would.
 */
export function nextTurn(
  sorted: readonly Combatant[],
  current: number,
): { index: number; isNewRound: boolean } | null {
  const living = sorted.flatMap((c, i) => (c.conditions.includes("Dead") ? [] : [i]));
  if (living.length === 0) return null;
  const waiting = living.find((i) => i !== current && !hasActed(sorted[i]));
  return { index: waiting ?? living[0], isNewRound: waiting === undefined };
}

/**
 * The fight once the turn has passed to `nextId`, sorted by initiative.
 *
 * Action, bonus and move are cleared once a round, when the order wraps, never
 * on entering a turn: the marks are the DM's record of the round, and stepping
 * back and forward through it must not wipe them. A reaction refreshes at the
 * start of its owner's turn and only then, and a readied action lapses with it,
 * since nothing lets it be carried past your own turn. The dead are left as
 * they are.
 */
export function passTurn(combatants: readonly Combatant[], nextId: string, isNewRound: boolean): Combatant[] {
  return combatants
    .map((c) => {
      if (c.conditions.includes("Dead")) return c;
      let next = c;
      if (isNewRound) next = { ...next, action: false, bonus: false, move: false };
      if (c.id === nextId) {
        next = { ...next, reaction: false };
        if (next.conditions.includes(READIED_CONDITION)) {
          next = { ...next, conditions: next.conditions.filter((x) => x !== READIED_CONDITION) };
        }
      }
      return next;
    })
    .sort(byInitiative);
}

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
