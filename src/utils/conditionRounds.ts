import type { Combatant } from "../types/index";

/**
 * How long a condition has been on somebody.
 *
 * A DM wants to know that the barbarian has been raging three rounds, or that
 * the wizard has held concentration for ten — the chip alone says only that it
 * is there. So each combatant carries the round its conditions began in, and
 * the count is worked out from that against the round on the table.
 *
 * The start round is recorded rather than a counter being incremented: a
 * counter has to be found and bumped every time the round changes, and would
 * drift the first time somebody stepped back through the order or loaded a
 * saved battle. A start round is a fact that never needs touching again.
 */

/** The round a condition began, per condition name. File-local: the exported
 *  functions speak in Combatants and numbers, so nothing outside needs it. */
type ConditionSince = Record<string, number>;

/**
 * Bring a combatant's start rounds into line with the conditions they hold.
 *
 * Anything newly on gets stamped with the round given; anything gone loses its
 * entry, so a condition that comes back later starts counting again rather
 * than resuming an old total.
 *
 * This is called from the one place every roster write goes through — see
 * CombatContext — so a condition picks up its round whichever path applied it:
 * the picker, a hero joining mid-fight, or damage dropping somebody into death
 * saves. Stamping at each of those instead would work until the next path was
 * added and nobody remembered this existed.
 *
 * Returns the SAME array when nothing changed. Every hit point change runs
 * through here, and a fresh array each time would rerender the whole roster.
 */
export function stampConditionRounds(list: Combatant[], round: number): Combatant[] {
  let listChanged = false;

  const next = list.map((combatant) => {
    const since: ConditionSince = combatant.conditionSince ?? {};
    const updated: ConditionSince = {};
    let changed = false;

    for (const name of combatant.conditions) {
      const start = since[name];
      /* A battle saved before any of this existed has no record at all, so its
         conditions start counting from now. That is the honest answer: the
         history was never written down, and guessing round 1 would claim a
         duration nobody measured. */
      updated[name] = start ?? round;
      if (start === undefined) changed = true;
    }

    /* Anything in the old record that is no longer held has been taken off. */
    if (!changed && Object.keys(since).length !== combatant.conditions.length) changed = true;
    if (!changed) return combatant;

    listChanged = true;
    return { ...combatant, conditionSince: updated };
  });

  return listChanged ? next : list;
}

/**
 * How many rounds a condition has been held, counting the one it started in.
 *
 * Null when there is nothing recorded — which means a battle older than this
 * feature, and is the difference between "no idea" and "one round".
 */
export function roundsHeld(
  combatant: Pick<Combatant, "conditionSince">,
  condition: string,
  round: number,
): number | null {
  const start = combatant.conditionSince?.[condition];
  if (start === undefined) return null;
  /* Never less than one: a condition applied on the round in question has been
     held for that round, and a saved battle restored at an earlier round
     should not report a negative. */
  return Math.max(1, round - start + 1);
}

/** What the tooltip says. Kept here so the wording is in one place. */
export function describeRoundsHeld(rounds: number | null): string | null {
  if (rounds === null) return null;
  return rounds === 1 ? "started this round" : `${rounds} rounds`;
}
