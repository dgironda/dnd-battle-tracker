import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  storeHeroes,
  getHeroes,
  storeMonsters,
  getMonsters,
  storeCombatants,
  getCombatants,
  getRoundNumber,
  clearCombatants,
  clearHeroes,
  clearMonsters,
} from '../src/utils/LocalStorage';
import type { Hero } from '../src/types/index';
import type { Monster } from '../src/types/index';
import type { Combatant } from '../src/types/index';

function createMemoryLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

describe('LocalStorage helpers', () => {
  let memory: ReturnType<typeof createMemoryLocalStorage>;

  beforeEach(() => {
    memory = createMemoryLocalStorage();
    vi.stubGlobal('localStorage', memory);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const sampleHero: Hero = {
    id: 'h1',
    name: 'Test',
    player: 'P1',
    present: true,
    hp: 12,
    maxHp: 12,
    currHp: 12,
    tHp: 0,
    ac: 14,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
    init: 2,
    conditions: [],
    link: '',
  };

  const sampleMonster: Monster = {
    id: 'm1',
    name: 'Goblin',
    link: '',
    hp: 7,
    maxHp: 7,
    currHp: 7,
    ac: 15,
    str: 8,
    dex: 14,
    con: 10,
    int: 10,
    wis: 10,
    cha: 8,
    pp: 12,
    init: 2,
    conditions: [],
    present: true,
  };

  const sampleCombatant: Combatant = {
    id: 'c1',
    name: 'Fighter',
    link: '',
    type: 'hero',
    currHp: 10,
    maxHp: 10,
    tHp: 0,
    initiative: 18,
    init: 2,
    action: false,
    bonus: false,
    move: false,
    reaction: false,
    conditions: [],
    deathsaves: [],
    ac: 16,
    str: 16,
    dex: 12,
    con: 14,
    int: 8,
    wis: 10,
    cha: 10,
    pp: 13,
  };

  it('round-trips heroes via storeHeroes / getHeroes', () => {
    clearHeroes();
    storeHeroes([sampleHero]);
    expect(getHeroes()).toEqual([sampleHero]);
  });

  it('round-trips monsters via storeMonsters / getMonsters', () => {
    clearMonsters();
    storeMonsters([sampleMonster]);
    expect(getMonsters()).toEqual([sampleMonster]);
  });

  it('returns empty array when heroes key is missing', () => {
    clearHeroes();
    expect(getHeroes()).toEqual([]);
  });

  it('returns empty array for corrupt heroes JSON without throwing', () => {
    localStorage.setItem('storedHeroes', '{not valid json');
    expect(getHeroes()).toEqual([]);
  });

  it('returns empty array for corrupt monsters JSON without throwing', () => {
    localStorage.setItem('storedMonsters', 'undefined');
    expect(getMonsters()).toEqual([]);
  });

  it('storeCombatants persists combatants and round; getRoundNumber reads round', () => {
    clearCombatants();
    storeCombatants([sampleCombatant], 4);
    expect(getCombatants()).toEqual([sampleCombatant]);
    expect(getRoundNumber()).toBe(4);
  });

  it('getRoundNumber returns 0 when round key missing', () => {
    localStorage.removeItem('roundNumber');
    expect(getRoundNumber()).toBe(0);
  });
});
