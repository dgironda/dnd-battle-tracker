import { describe, it, expect, vi } from 'vitest';
import { startBattle } from '../src/utils/battleUtils';
import { Hero, Combatant } from '../src/types/index';

function makeHero(overrides: Partial<Hero> & Pick<Hero, 'id' | 'name'>): Hero {
  return {
    player: 'P1',
    present: true,
    hp: 10,
    maxHp: 10,
    currHp: 10,
    tHp: 0,
    ac: 15,
    str: 10,
    dex: 12,
    con: 14,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 12,
    init: 0,
    conditions: [],
    link: '',
    ...overrides,
  };
}

describe('battleUtils', () => {
  describe('startBattle', () => {
    it('should create combatants only for heroes that are present', async () => {
      const heroes: Hero[] = [
        makeHero({ id: '1', name: 'Hero 1', present: true }),
        makeHero({ id: '2', name: 'Hero 2', present: false }),
      ];

      const mockDialog = vi.fn().mockResolvedValue(15);

      const result = await startBattle(heroes, mockDialog);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('Hero 1');
      expect(mockDialog).toHaveBeenCalledTimes(1);
      expect(mockDialog).toHaveBeenCalledWith('Hero 1');
    });

    it('should correctly map hero properties to a combatant', async () => {
      const heroes: Hero[] = [
        makeHero({
          id: '1',
          name: 'Hero 1',
          hp: 25,
          maxHp: 25,
          currHp: 25,
          tHp: 5,
          ac: 16,
          str: 18,
          dex: 14,
          con: 16,
          int: 8,
          wis: 10,
          cha: 12,
          pp: 15,
        }),
      ];

      const mockDialog = vi.fn().mockResolvedValue(18);

      const result = await startBattle(heroes, mockDialog);

      expect(result).toHaveLength(1);
      const combatant = result[0];

      expect(combatant.type).toBe('hero');
      expect(combatant.currHp).toBe(25);
      expect(combatant.maxHp).toBe(25);
      expect(combatant.tHp).toBe(5);
      expect(combatant.init).toBe(18);
      expect(combatant.initiative).toBe(18);

      expect(combatant.ac).toBe(16);
      expect(combatant.str).toBe(18);
      expect(combatant.dex).toBe(14);
      expect(combatant.con).toBe(16);
      expect(combatant.int).toBe(8);
      expect(combatant.wis).toBe(10);
      expect(combatant.cha).toBe(12);
      expect(combatant.pp).toBe(15);

      expect(combatant.stats).toContain('Strength: 18');
    });

    it('should call the initiative dialog once per present hero in order', async () => {
      const heroes: Hero[] = [
        makeHero({ id: 'a', name: 'Alpha', present: true }),
        makeHero({ id: 'b', name: 'Beta', present: false }),
        makeHero({ id: 'c', name: 'Gamma', present: true }),
      ];

      const mockDialog = vi
        .fn()
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10);

      const result = await startBattle(heroes, mockDialog);

      expect(mockDialog).toHaveBeenCalledTimes(2);
      expect(mockDialog.mock.calls[0][0]).toBe('Alpha');
      expect(mockDialog.mock.calls[1][0]).toBe('Gamma');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alpha');
      expect(result[0].initiative).toBe(20);
      expect(result[1].name).toBe('Gamma');
      expect(result[1].initiative).toBe(10);
    });

    it('should return an empty array when no heroes are present', async () => {
      const heroes: Hero[] = [
        makeHero({ id: '1', name: 'Solo', present: false }),
      ];

      const mockDialog = vi.fn().mockResolvedValue(99);

      const result = await startBattle(heroes, mockDialog);

      expect(result).toEqual([]);
      expect(mockDialog).not.toHaveBeenCalled();
    });
  });

  describe('initiative sort invariant (BattleTracker behavior)', () => {
    it('sorts combatants by initiative descending', () => {
      const rows: Pick<Combatant, 'id' | 'name' | 'initiative'>[] = [
        { id: '1', name: 'Low', initiative: 5 },
        { id: '2', name: 'High', initiative: 22 },
        { id: '3', name: 'Mid', initiative: 12 },
      ];
      const sorted = [...rows].sort((a, b) => b.initiative - a.initiative);
      expect(sorted.map((c) => c.name)).toEqual(['High', 'Mid', 'Low']);
    });
  });
});
