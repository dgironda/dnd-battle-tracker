import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Combatant, Hero } from '../src/types/index';
import {
  campaignKey,
  clearCampaign,
  getCampaignStamps,
  removeKey,
  storeCampaignBattleLog,
  storeCampaignCombatants,
  storeCampaignHeroes,
  unpinCampaign,
  writeKey,
} from '../src/utils/LocalStorage';
import { storeCampaignConditionRules } from '../src/utils/conditionRules';
import { getCampaignData, putCampaignData, toFightPaper } from '../src/utils/campaignData';
import { BRIDGE_VERSION, changeReporter, eventFor, handleRequest } from '../src/bridge';

/**
 * BattleTracker's side of keeping its copy of a campaign in step with dmOS's:
 * when each part (party, fight, rules) last changed, reading the parts, and
 * taking dmOS's copy of them, newest winning.
 */

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    has: (key: string) => map.has(key),
  };
}

const hero = (id: string, name: string, extra: Partial<Hero> = {}) =>
  ({ id, name, player: '', hp: 20, maxHp: 20, currHp: 20, tHp: 0, ac: 14, conditions: [], ...extra }) as Hero;

function combatant(id: string, name: string, initiative: number, extra: Partial<Combatant> = {}): Combatant {
  return {
    id, name, link: '', type: 'hero',
    currHp: 20, maxHp: 20, tHp: 0,
    initiative, init: 0,
    action: false, bonus: false, move: false, reaction: false,
    conditions: [], deathsaves: [],
    ac: 12, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, pp: 10,
    ...extra,
  };
}

const KESSA = combatant('h1', 'Kessa', 18);
const GOBLIN = combatant('m1', 'Goblin 1', 12, { type: 'monster' });
const LURKER = combatant('m2', 'Lurker', 15, { type: 'monster', conditions: ['Invisible'] });

const fight = (at: number, extra: Record<string, unknown> = {}) => ({
  combatants: [KESSA, GOBLIN],
  round: 2,
  turnIndex: 1,
  turnStartedAt: 1_700_000_000_000,
  log: [{ id: 'e1', at: 1_700_000_000_000, round: 2, kind: 'round', who: '' }],
  at,
  ...extra,
});

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  unpinCampaign();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-22T19:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const NOW = () => Date.now();

describe('when each part last changed', () => {
  it('reads 0 for a campaign nothing has stamped', () => {
    expect(getCampaignStamps('ember-keep')).toEqual({ party: 0, fight: 0, rules: 0 });
  });

  it('stamps the part a write changes, whichever path made it', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    expect(getCampaignStamps('ember-keep')).toEqual({ party: NOW(), fight: 0, rules: 0 });

    vi.advanceTimersByTime(1000);
    storeCampaignCombatants('ember-keep', [KESSA]);
    expect(getCampaignStamps('ember-keep').fight).toBe(NOW());

    vi.advanceTimersByTime(1000);
    writeKey(campaignKey('roundNumber', 'ember-keep'), '3');
    expect(getCampaignStamps('ember-keep').fight).toBe(NOW());

    vi.advanceTimersByTime(1000);
    storeCampaignConditionRules('ember-keep', { conditions: [{ name: 'Slowed', description: '' }] });
    expect(getCampaignStamps('ember-keep').rules).toBe(NOW());

    /* The default campaign keeps its stamps under the plain key, like its data. */
    writeKey('storedHeroes', '[]');
    expect(getCampaignStamps('default').party).toBe(NOW());
  });

  it('leaves the stamp alone when a write changes nothing', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    const first = getCampaignStamps('ember-keep').party;

    vi.advanceTimersByTime(5000);
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    expect(getCampaignStamps('ember-keep').party).toBe(first);
  });

  it('stamps a removal, as when a fight is cleared after a crash', () => {
    storeCampaignCombatants('ember-keep', [KESSA]);
    vi.advanceTimersByTime(1000);

    removeKey(campaignKey('storedCombatants', 'ember-keep'));
    expect(getCampaignStamps('ember-keep').fight).toBe(NOW());

    /* Removing what was never there changes nothing. */
    vi.advanceTimersByTime(1000);
    removeKey(campaignKey('battleLog', 'ember-keep'));
    expect(getCampaignStamps('ember-keep').fight).toBe(NOW() - 1000);
  });

  it('goes with a deleted campaign', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    clearCampaign('ember-keep');
    expect(storage.has('campaign:ember-keep:changeStamps')).toBe(false);
  });
});

describe('reading a campaign', () => {
  it('gives each part with its stamp', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    storeCampaignCombatants('ember-keep', [KESSA, GOBLIN]);
    storeCampaignBattleLog('ember-keep', []);

    const data = getCampaignData('ember-keep');
    expect(data.party.heroes.map((h) => h.name)).toEqual(['Kessa']);
    expect(data.party.at).toBe(NOW());
    expect(data.fight.combatants.map((c) => c.id)).toEqual(['h1', 'm1']);
    expect(data.fight.turnStartedAt).toBeNull();
    expect(data.fight.at).toBe(NOW());
    /* No rules of its own: the list BattleTracker ships, never stamped. */
    expect(data.rules).toEqual({ conditions: null, at: 0 });
  });
});

describe('taking dmOS’s copy', () => {
  it('writes a newer part and keeps dmOS’s time for it, not its own', () => {
    const at = NOW() - 60_000;
    const result = putCampaignData('ember-keep', { party: { heroes: [hero('h1', 'Kessa')], at } });

    expect(result).toEqual({ party: { applied: true } });
    expect(getCampaignData('ember-keep').party).toMatchObject({ at, heroes: [{ id: 'h1', name: 'Kessa' }] });
  });

  it('refuses an older part, and sends back what it has', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa', { ac: 16 })]);

    const result = putCampaignData('ember-keep', { party: { heroes: [hero('h1', 'Kessa', { ac: 14 })], at: NOW() - 1 } });

    expect(result.party).toMatchObject({ applied: false, current: { at: NOW(), heroes: [{ ac: 16 }] } });
    expect(getCampaignData('ember-keep').party.heroes[0].ac).toBe(16);
  });

  it('applies a part from the same moment', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    const result = putCampaignData('ember-keep', { party: { heroes: [hero('h1', 'Kessa', { ac: 17 })], at: NOW() } });
    expect(result.party).toEqual({ applied: true });
  });

  it('judges each part on its own', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);

    const result = putCampaignData('ember-keep', {
      party: { heroes: [], at: NOW() - 1 },
      fight: fight(NOW() + 1),
    });

    expect(result.party).toMatchObject({ applied: false });
    expect(result.fight).toEqual({ applied: true });
    expect(getCampaignData('ember-keep').fight).toMatchObject({ round: 2, turnIndex: 1, at: NOW() + 1 });
  });

  it('writes the whole fight, and the one value an open tracker reloads from, last', () => {
    putCampaignData('ember-keep', { fight: fight(NOW(), { turnStartedAt: null }) });

    const data = getCampaignData('ember-keep').fight;
    expect(data.turnStartedAt).toBeNull();
    expect(data.log.map((e) => e.id)).toEqual(['e1']);
    const sync = JSON.parse(storage.getItem('campaign:ember-keep:battleSync')!);
    expect(sync.combatants.map((c: Combatant) => c.id)).toEqual(['h1', 'm1']);
    expect(sync.turnIndex).toBe(1);
  });

  it('clears a campaign’s own conditions back to the shipped list', () => {
    storeCampaignConditionRules('ember-keep', { conditions: [{ name: 'Slowed', description: '' }] });

    putCampaignData('ember-keep', { rules: { conditions: null, at: NOW() } });

    expect(getCampaignData('ember-keep').rules).toEqual({ conditions: null, at: NOW() });
  });

  it('writes nothing when any part is malformed', () => {
    expect(() =>
      putCampaignData('ember-keep', {
        party: { heroes: [hero('h1', 'Kessa')], at: NOW() },
        fight: { ...fight(NOW()), round: 'two' },
      }),
    ).toThrow(/whole numbers/);
    expect(getCampaignData('ember-keep').party.heroes).toEqual([]);

    expect(() => putCampaignData('ember-keep', {})).toThrow(/at least one/);
    expect(() => putCampaignData('ember-keep', { party: { heroes: [{ name: 'No id' }], at: NOW() } })).toThrow(/id/);
    expect(() => putCampaignData('ember-keep', { party: { heroes: [], at: -5 } })).toThrow(/milliseconds/);
  });
});

describe('the initiative paper', () => {
  it('is Battle Link’s view of the fight it is given', () => {
    const paper = toFightPaper({ combatants: [GOBLIN, KESSA, LURKER], round: 2, turnIndex: 2 });

    expect(paper.v).toBe(1);
    expect(paper.round).toBe(2);
    /* In initiative order, without the monster the DM has hidden. */
    expect(paper.combatants.map((c) => c.name)).toEqual(['Kessa', 'Goblin 1']);
    /* turnIndex counts the hidden Lurker, as the tracker does: index 2 is the goblin. */
    expect(paper.combatants.find((c) => c.isCurrentTurn)?.name).toBe('Goblin 1');
    /* Bands, never numbers. */
    expect(paper.combatants[0].hp).toBe('unharmed');
    expect(paper.combatants[0]).not.toHaveProperty('currHp');
  });

  it('refuses a fight it can’t read', () => {
    expect(() => toFightPaper({ combatants: [{ id: 'x' }], round: 1, turnIndex: 0 })).toThrow(/combatant/);
    expect(() => toFightPaper({ combatants: [], round: -1, turnIndex: 0 })).toThrow(/whole numbers/);
  });
});

describe('the bridge', () => {
  it('is version 9, and no longer hands out a Battle Link URL', () => {
    expect(BRIDGE_VERSION).toBe(9);
    expect(handleRequest('getFightPaper', { campaignId: 'ember-keep' })).toEqual({
      error: 'Unknown method getFightPaper.',
    });
  });

  it('reads, writes and draws through its methods', () => {
    const put = handleRequest('putCampaignData', { campaignId: 'ember-keep', fight: fight(NOW()) });
    expect(put).toEqual({ result: { fight: { applied: true } } });

    const got = handleRequest('getCampaignData', { campaignId: 'ember-keep' }) as { result: { fight: { round: number } } };
    expect(got.result.fight.round).toBe(2);

    const paper = handleRequest('toFightPaper', { combatants: [KESSA, GOBLIN], round: 1, turnIndex: 0 }) as {
      result: { combatants: { name: string; isCurrentTurn: boolean }[] };
    };
    expect(paper.result.combatants.find((c) => c.isCurrentTurn)?.name).toBe('Kessa');

    expect(handleRequest('getCampaignData', {})).toEqual({ error: 'A valid campaignId is required.' });
  });

  it('tells dmOS when the change it reports was made', () => {
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    expect(eventFor('campaign:ember-keep:storedHeroes')).toEqual({
      event: 'heroesChanged',
      campaignId: 'ember-keep',
      at: NOW(),
    });
  });

  /* Another page sees each key's new value only as that key's storage event
     arrives, so the stamp read at the first key's event was the one from
     before the change, and a turn's later keys weren't in yet. */
  it('reports a burst of writes once, after it settles, with the stamp the burst left', () => {
    const post = vi.fn();
    const report = changeReporter(post);
    storeCampaignHeroes('ember-keep', [hero('h1', 'Kessa')]);
    vi.advanceTimersByTime(1000);

    /* A turn in the tracker: three keys, each heard on its own, the stamps
       between them, and the monster library, which needs no waiting. */
    storeCampaignCombatants('ember-keep', [KESSA, GOBLIN]);
    report('campaign:ember-keep:storedCombatants');
    report('campaign:ember-keep:changeStamps');
    vi.advanceTimersByTime(10);
    writeKey(campaignKey('roundNumber', 'ember-keep'), '4');
    report('campaign:ember-keep:roundNumber');
    report('campaign:ember-keep:storedHeroes');
    report('storedMonsters');

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith({ event: 'monstersChanged' });
    expect(post).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'battleChanged' }));

    vi.advanceTimersByTime(50);

    expect(post).toHaveBeenCalledWith({
      event: 'battleChanged',
      campaignId: 'ember-keep',
      at: getCampaignStamps('ember-keep').fight,
    });
    expect(getCampaignStamps('ember-keep').fight).toBe(NOW() - 50);
    expect(post).toHaveBeenCalledWith({
      event: 'heroesChanged',
      campaignId: 'ember-keep',
      at: getCampaignStamps('ember-keep').party,
    });
    /* Once each. */
    expect(post).toHaveBeenCalledTimes(3);

    /* A key nobody reports, with nothing waiting, changes nothing. */
    report('appSettings');
    vi.advanceTimersByTime(100);
    expect(post).toHaveBeenCalledTimes(3);
  });
});
