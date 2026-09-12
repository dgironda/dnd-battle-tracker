import { describe, it, expect } from 'vitest';
import type { Combatant } from '../src/types/index';
import { stampConditionRounds, roundsHeld, describeRoundsHeld } from '../src/utils/conditionRounds';

/**
 * How long a condition has been held.
 *
 * The start round is what is recorded, and the count is worked out from it — so
 * these are about the record staying honest: stamped when a condition arrives,
 * left alone once set, and forgotten when the condition goes, so that the same
 * condition applied again later starts from one rather than resuming a total
 * nobody was counting.
 */

function combatant(conditions: string[], since?: Record<string, number>): Combatant {
  return {
    id: 'cr-1', name: 'Aldric', link: '', type: 'hero',
    currHp: 20, maxHp: 20, tHp: 0, initiative: 12, init: 0,
    action: false, bonus: false, move: false, reaction: false,
    conditions, conditionSince: since, deathsaves: [],
    ac: 12, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, pp: 10,
  };
}

describe('condition rounds', () => {
  it('stamps a condition with the round it arrived in', () => {
    const [stamped] = stampConditionRounds([combatant(['Raging'])], 4);
    expect(stamped.conditionSince).toEqual({ Raging: 4 });
  });

  it('leaves a start round alone once it is set', () => {
    const [stamped] = stampConditionRounds([combatant(['Raging'], { Raging: 2 })], 9);
    expect(stamped.conditionSince).toEqual({ Raging: 2 });
  });

  it('forgets a condition that has been taken off', () => {
    const [stamped] = stampConditionRounds(
      [combatant(['Blessed'], { Raging: 2, Blessed: 3 })],
      5,
    );
    expect(stamped.conditionSince).toEqual({ Blessed: 3 });
  });

  it('starts again from scratch when the same condition comes back', () => {
    /* Raging in round 2, dropped, raging again in round 7 is a new rage — not
       a continuation of a five-round one. */
    const [dropped] = stampConditionRounds([combatant([], { Raging: 2 })], 5);
    const [again] = stampConditionRounds([{ ...dropped, conditions: ['Raging'] }], 7);
    expect(again.conditionSince).toEqual({ Raging: 7 });
  });

  it('hands back the very same array when nothing changed', () => {
    /* Every hit point change runs through this. A new array each time would
       rerender the whole roster for nothing. */
    const list = stampConditionRounds([combatant(['Raging'])], 3);
    expect(stampConditionRounds(list, 3)).toBe(list);
  });

  it('counts the round it started in as the first', () => {
    const c = combatant(['Raging'], { Raging: 3 });
    expect(roundsHeld(c, 'Raging', 3)).toBe(1);
    expect(roundsHeld(c, 'Raging', 5)).toBe(3);
    expect(roundsHeld(c, 'Raging', 12)).toBe(10);
  });

  it('says nothing at all for a condition with no record', () => {
    /* A battle saved before any of this existed. "No idea" is not "one round",
       and the chip shows no count rather than a wrong one. */
    expect(roundsHeld(combatant(['Raging']), 'Raging', 5)).toBeNull();
    expect(describeRoundsHeld(null)).toBeNull();
  });

  it('never reports less than a round', () => {
    /* A saved battle restored at an earlier round than the stamp it carries. */
    expect(roundsHeld(combatant(['Raging'], { Raging: 8 }), 'Raging', 2)).toBe(1);
  });

  it('words the count for the tooltip', () => {
    expect(describeRoundsHeld(1)).toBe('started this round');
    expect(describeRoundsHeld(3)).toBe('3 rounds');
  });
});
