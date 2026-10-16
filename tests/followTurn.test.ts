import { describe, it, expect } from 'vitest';
import type { Combatant } from '../src/types/index';
import { followTurn, hasActed } from '../src/utils/turnOrder';

/**
 * The turn is a position in initiative order, so when the order changes the
 * position has to move with whoever is acting.
 */

function fighter(id: string, initiative: number, acted = false): Combatant {
  return {
    id,
    name: id,
    link: '',
    type: 'monster',
    currHp: 10,
    maxHp: 10,
    tHp: 0,
    initiative,
    init: 0,
    action: acted,
    bonus: acted,
    move: acted,
    reaction: false,
    conditions: [],
    deathsaves: [],
    ac: 10,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
  };
}

/* Brannoc is acting: second in order, at index 1. */
const FIGHT = [fighter('aldric', 20, true), fighter('brannoc', 15), fighter('cressa', 10)];

describe('following the turn', () => {
  it('stays on whoever is acting when someone else moves above them', () => {
    const after = FIGHT.map((c) => (c.id === 'cressa' ? { ...c, initiative: 18 } : c));
    expect(followTurn(FIGHT, 1, after)).toBe(2);
  });

  it('stays on whoever is acting when someone joins above them', () => {
    expect(followTurn(FIGHT, 1, [...FIGHT, fighter('gerwin', 17)])).toBe(2);
  });

  it('does not move when the change is below them', () => {
    expect(followTurn(FIGHT, 1, [...FIGHT, fighter('gerwin', 12)])).toBe(1);
  });

  it("follows the acting combatant's own total wherever it goes", () => {
    const after = FIGHT.map((c) => (c.id === 'brannoc' ? { ...c, initiative: 25 } : c));
    expect(followTurn(FIGHT, 1, after)).toBe(0);
  });

  it('leaves the position alone when the acting combatant has left the fight', () => {
    expect(followTurn(FIGHT, 1, FIGHT.filter((c) => c.id !== 'brannoc'))).toBe(1);
    expect(followTurn(FIGHT, 7, FIGHT)).toBe(7);
  });

  it('reads the order the tracker shows, whatever order the fight is stored in', () => {
    const shuffled = [FIGHT[2], FIGHT[0], FIGHT[1]];
    expect(followTurn(shuffled, 1, [...shuffled, fighter('gerwin', 17)])).toBe(2);
  });

  it('counts a turn as had once Action, Bonus and Move are all ticked', () => {
    expect(hasActed(FIGHT[0])).toBe(true);
    expect(hasActed(FIGHT[1])).toBe(false);
    expect(hasActed({ ...FIGHT[1], action: true, bonus: true })).toBe(false);
  });
});
