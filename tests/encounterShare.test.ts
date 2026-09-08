/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import {
  buildEncounterUrl,
  parseEncounterParam,
  parseLegacyMonstersParam,
  ENCOUNTER_PARAM,
  MAX_URL_LENGTH,
} from '../src/utils/encounterShare';
import type { Monster } from '../src/types';

const monster = (over: Partial<Monster> = {}): Monster => ({
  id: crypto.randomUUID(),
  name: 'Goblin',
  link: 'https://5e.tools/goblin',
  hp: 7, maxHp: 7, currHp: 7,
  ac: 15, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8,
  pp: 9, init: 2, hidden: false, present: true, conditions: [],
  ...over,
});

const roundTrip = (name: string, monsters: Monster[]) => {
  const { url } = buildEncounterUrl({ name, monsters }, 'https://example.test/');
  const value = new URL(url).searchParams.get(ENCOUNTER_PARAM)!;
  return parseEncounterParam(value);
};

describe('encounter links', () => {
  it('carries the name and the monsters', () => {
    const out = roundTrip('Goblin Ambush', [monster(), monster({ name: 'Goblin Boss', hp: 21 })]);
    expect(out?.name).toBe('Goblin Ambush');
    expect(out?.monsters.map((m) => m.name)).toEqual(['Goblin', 'Goblin Boss']);
  });

  it('keeps the stats that matter', () => {
    const out = roundTrip('One', [monster({ ac: 17, str: 18, pp: 13, init: 3 })]);
    const m = out!.monsters[0];
    expect([m.ac, m.str, m.pp, m.init]).toEqual([17, 18, 13, 3]);
  });

  it('restores defaults for stats left out of the payload', () => {
    // dex 10 / pp 0 are the defaults, so they are not transmitted at all
    const out = roundTrip('One', [monster({ dex: 10, pp: 0 })]);
    expect(out!.monsters[0].dex).toBe(10);
    expect(out!.monsters[0].pp).toBe(0);
  });

  it('sends monsters at full health, whatever state they were in', () => {
    const out = roundTrip('Bloodied', [monster({ maxHp: 30, currHp: 4, conditions: ['Prone'] })]);
    const m = out!.monsters[0];
    expect(m.currHp).toBe(30);
    expect(m.maxHp).toBe(30);
    expect(m.conditions).toEqual([]);
  });

  it('mints fresh ids rather than trusting the link', () => {
    const source = monster();
    const out = roundTrip('One', [source]);
    expect(out!.monsters[0].id).not.toBe(source.id);
    expect(out!.monsters[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('strips a link that is not http(s)', () => {
    const out = roundTrip('Nasty', [monster({ link: 'javascript:alert(1)' as string })]);
    expect(out!.monsters[0].link).toBe('');
  });

  it('keeps an http(s) link', () => {
    const out = roundTrip('One', [monster({ link: 'https://5e.tools/goblin' })]);
    expect(out!.monsters[0].link).toBe('https://5e.tools/goblin');
  });

  it('survives names outside Latin-1', () => {
    const out = roundTrip('Ambush', [monster({ name: 'Dæmon — Ogre’s Bane' })]);
    expect(out!.monsters[0].name).toBe('Dæmon — Ogre’s Bane');
  });

  it('rejects a payload that is not an encounter', () => {
    expect(parseEncounterParam('not-base64!!')).toBeNull();
    expect(parseEncounterParam(btoa('{"nope":1}'))).toBeNull();
  });

  it('rejects an encounter with no usable monsters', () => {
    const empty = btoa(JSON.stringify({ v: 1, n: 'x', m: [{ hp: 3 }] }));
    expect(parseEncounterParam(empty)).toBeNull();
  });

  it('reports a link that is too long instead of producing a broken one', () => {
    const many = Array.from({ length: 400 }, (_, i) => monster({ name: `Goblin ${i}` }));
    const { tooLong, length } = buildEncounterUrl({ name: 'Horde', monsters: many }, 'https://example.test/');
    expect(tooLong).toBe(true);
    expect(length).toBeGreaterThan(MAX_URL_LENGTH);
  });

  it('fits a realistic encounter well inside the limit', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => monster({ name: `Goblin ${i + 1}` }));
    const { tooLong } = buildEncounterUrl({ name: 'Goblin Ambush', monsters: twenty }, 'https://example.test/');
    expect(tooLong).toBe(false);
  });

  it('still reads a link made by the old whole-roster share', () => {
    const legacy = btoa(JSON.stringify([
      { name: 'Skeleton', hp: 13, ac: 13, str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5, pp: 9, init: 2, link: '' },
    ]));
    const out = parseLegacyMonstersParam(legacy);
    expect(out?.monsters[0].name).toBe('Skeleton');
    expect(out?.monsters[0].hp).toBe(13);
    expect(out?.name).toBe('');
  });
});
