import { describe, it, expect } from 'vitest';
import monsters2014 from '../src/assets/2014monsters.json';
import monsters2024 from '../src/assets/2024monsters.json';

/**
 * Challenge ratings in both bestiaries (tools/add-challenge-ratings.mjs), for
 * dmOS's Encounter Builder: a rating as the books write it, or none for a
 * creature that has none (a summoned spirit, a sidekick).
 */

type Listed = { name: string; cr?: string };
const RATING = /^(\d+|1\/[248])$/;
const crOf = (list: Listed[], name: string) => list.find((m) => m.name === name)?.cr;
/** "1/4" -> 0.25. */
const valueOf = (cr: string) => (cr.includes('/') ? 1 / Number(cr.split('/')[1]) : Number(cr));

describe('challenge ratings', () => {
  it.each([
    ['2014', monsters2014 as Listed[]],
    ['2024', monsters2024 as Listed[]],
  ])('are written as the books write them in the %s list, for nearly every monster', (_, list) => {
    const rated = list.filter((m) => m.cr !== undefined);
    expect(rated.filter((m) => !RATING.test(m.cr!) || valueOf(m.cr!) > 30).map((m) => `${m.name}: ${m.cr}`)).toEqual([]);
    expect(rated.length / list.length).toBeGreaterThan(0.95);
  });

  it('match the books for some old friends', () => {
    expect(crOf(monsters2014, 'Goblin')).toBe('1/4');
    expect(crOf(monsters2014, 'Adult Red Dragon')).toBe('17');
    expect(crOf(monsters2014, 'Tarrasque')).toBe('30');
    expect(crOf(monsters2024, 'Goblin Warrior')).toBe('1/4');
    expect(crOf(monsters2024, 'Steam Mephit')).toBe('1/4');
  });
});
