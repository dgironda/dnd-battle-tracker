import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUpdateMonster, createDeleteMonster } from '../src/utils/Utils';
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

/** Apply the updater a mocked setState was called with. */
function applyUpdater(setter: ReturnType<typeof vi.fn>, prev: Monster[]): Monster[] {
  const updater = setter.mock.calls[0][0];
  expect(typeof updater).toBe('function');
  return (updater as (p: Monster[]) => Monster[])(prev);
}

describe('Utils monster helpers', () => {
  const confirmMock = vi.fn(() => true);

  beforeEach(() => {
    confirmMock.mockReset();
    confirmMock.mockReturnValue(true);
    // No DialogHost is mounted in unit tests, so confirmDialog falls back to
    // window.confirm.
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
    const next = applyUpdater(setMonsters, prev);
    expect(next.find((m) => m.id === 'b')?.ac).toBe(18);
    expect(next.find((m) => m.id === 'a')?.ac).toBe(10);
  });

  it('createDeleteMonster removes the id when the user confirms', async () => {
    const monsters: Monster[] = [makeMonster({ id: 'x', name: 'X' }), makeMonster({ id: 'y', name: 'Y' })];
    const setMonsters = vi.fn();
    const del = createDeleteMonster(monsters, setMonsters);

    await del('x', false);

    expect(confirmMock).toHaveBeenCalled();
    // Deletion goes through the state updater now. It used to write
    // localStorage directly and hand back a plain array, which left every other
    // mounted copy of the roster stale.
    expect(applyUpdater(setMonsters, monsters)).toEqual([monsters[1]]);
  });

  it('createDeleteMonster skips the prompt when skipPrompt is true', async () => {
    const monsters: Monster[] = [makeMonster({ id: 'only', name: 'Solo' })];
    const setMonsters = vi.fn();
    const del = createDeleteMonster(monsters, setMonsters);

    await del('only', true);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(applyUpdater(setMonsters, monsters)).toEqual([]);
  });

  it('createDeleteMonster does nothing when the user cancels', async () => {
    confirmMock.mockReturnValue(false);
    const monsters: Monster[] = [makeMonster({ id: 'z', name: 'Z' })];
    const setMonsters = vi.fn();
    const del = createDeleteMonster(monsters, setMonsters);

    await del('z', false);

    expect(setMonsters).not.toHaveBeenCalled();
  });
});
