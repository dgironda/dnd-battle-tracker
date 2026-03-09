import { describe, it, expect, vi } from 'vitest';
import { startBattle } from '../src/utils/battleUtils';
import { Hero } from '../src/types/index';

describe('battleUtils', () =>
{
    describe('startBattle', () =>
    {
        it('should create combatants only for heroes that are present', async () =>
        {
            const heroes: Hero[] = [
                {
                    id: '1', name: 'Hero 1', player: 'P1', present: true, hp: 10, maxHp: 10, currHp: 10, tHp: 0, ac: 15,
                    str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 10, pp: 12, init: 0, conditions: [], link: ''
                },
                {
                    id: '2', name: 'Hero 2', player: 'P2', present: false, hp: 10, maxHp: 10, currHp: 10, tHp: 0, ac: 15,
                    str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 10, pp: 12, init: 0, conditions: [], link: ''
                }
            ];

            const mockDialog = vi.fn().mockResolvedValue(15);

            const result = await startBattle(heroes, mockDialog);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
            expect(result[0].name).toBe('Hero 1');
            expect(mockDialog).toHaveBeenCalledTimes(1);
            expect(mockDialog).toHaveBeenCalledWith('Hero 1');
        });

        it('should correctly map hero properties to a combatant', async () =>
        {
            const heroes: Hero[] = [
                {
                    id: '1', name: 'Hero 1', player: 'P1', present: true, hp: 25, maxHp: 25, currHp: 25, tHp: 5, ac: 16,
                    str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 12, pp: 15, init: 0, conditions: [], link: ''
                }
            ];

            const mockDialog = vi.fn().mockResolvedValue(18); // Rolled an 18 for initiative

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
    });
});
