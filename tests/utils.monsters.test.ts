import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUpdateMonster, createDeleteMonster } from '../src/utils/Utils';
import * as LocalStorage from '../src/utils/LocalStorage';
import type { Monster } from '../src/types/index';

function makeMonster(overrides: Partial<Monster> & Pick<Monster, 'id' | 'name'>): Monster {
  return {
    link: '',
    hp: 10,
    maxHp: 10,
    currHp: 10,
    ac: 12,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
    init: 0,
    conditions: [],
    present: true,
    ...overrides,
  };
}

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe('Utils monster helpers', () => {
  const confirmMock = vi.fn(() => true);

  beforeEach(() => {
    stubLocalStorage();
    confirmMock.mockReset();
    confirmMock.mockReturnValue(true);
    vi.stubGlobal('confirm', confirmMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('createUpdateMonster maps field updates through setMonsters', () => {
    const setMonsters = vi.fn();
    const update = createUpdateMonster(setMonsters);
    const prev: Monster[] = [
      makeMonster({ id: 'a', name: 'A', ac: 10 }),
      makeMonster({ id: 'b', name: 'B', ac: 11 }),
    ];

    update('b', 'ac', 18);

    expect(setMonsters).toHaveBeenCalledTimes(1);
    const updater = setMonsters.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    const next = (updater as (p: Monster[]) => Monster[])(prev);
    expect(next.find((m) => m.id === 'b')?.ac).toBe(18);
    expect(next.find((m) => m.id === 'a')?.ac).toBe(10);
  });

  it('createDeleteMonster removes id when confirm returns true', () => {
    const monsters: Monster[] = [makeMonster({ id: 'x', name: 'X' }), makeMonster({ id: 'y', name: 'Y' })];
    vi.spyOn(LocalStorage, 'getMonsters').mockReturnValue(monsters);

    const setMonsters = vi.fn();
    const del = createDeleteMonster(monsters, setMonsters);

    del('x', false);

    expect(confirmMock).toHaveBeenCalled();
    expect(setMonsters).toHaveBeenCalledWith([monsters[1]]);
    expect(JSON.parse(localStorage.getItem('storedMonsters')!)).toEqual([expect.objectContaining({ id: 'y' })]);
  });

  it('createDeleteMonster skips confirm when skipPrompt is true', () => {
    const monsters: Monster[] = [makeMonster({ id: 'only', name: 'Solo' })];
    vi.spyOn(LocalStorage, 'getMonsters').mockReturnValue(monsters);
    const setMonsters = vi.fn();
    const del = createDeleteMonster(monsters, setMonsters);

    del('only', true);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(setMonsters).toHaveBeenCalledWith([]);
  });

  it('createDeleteMonster does nothing when confirm returns false', () => {
    confirmMock.mockReturnValue(false);
    const monsters: Monster[] = [makeMonster({ id: 'z', name: 'Z' })];
    vi.spyOn(LocalStorage, 'getMonsters').mockReturnValue(monsters);
    const setMonsters = vi.fn();
    const del = createDeleteMonster(monsters, setMonsters);

    del('z', false);

    expect(setMonsters).not.toHaveBeenCalled();
  });
});
