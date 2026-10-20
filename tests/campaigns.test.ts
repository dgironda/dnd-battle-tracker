import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  STORAGE_KEYS,
  ACTIVE_CAMPAIGN_KEY,
  campaignKey,
  clearCampaign,
  otherCampaignPhotoIds,
  readActiveCampaign,
  storeHeroes,
  unpinCampaign,
} from '../src/utils/LocalStorage';
import { answer, eventFor, handleRequest } from '../src/bridge';
import { isAllowedOrigin, rememberDmosReturn, takeDmosReturn } from '../src/utils/dmos';

function memoryStorage() {
  const map = new Map<string, string>();
  const store = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    keys: () => [...map.keys()],
  };
  // Object.keys(localStorage) lists stored keys in a browser; make it do so here.
  return new Proxy(store, {
    ownKeys: () => [...map.keys()],
    getOwnPropertyDescriptor: (_target, key) =>
      typeof key === 'string' && map.has(key)
        ? { enumerable: true, configurable: true, value: map.get(key) }
        : undefined,
  });
}

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  unpinCampaign();
});

afterEach(() => {
  vi.unstubAllGlobals();
  unpinCampaign();
});

const setActive = (id: string, name = id) =>
  storage.setItem(ACTIVE_CAMPAIGN_KEY, JSON.stringify({ id, name }));

describe('campaign storage keys', () => {
  it('keeps the default campaign on the original keys', () => {
    expect(STORAGE_KEYS.heroes).toBe('storedHeroes');
    expect(STORAGE_KEYS.savedBattles).toBe('savedBattles');
    expect(STORAGE_KEYS.monsters).toBe('storedMonsters');
  });

  it('gives another campaign its own keys, but shares monsters and settings', () => {
    setActive('strahd');
    expect(STORAGE_KEYS.heroes).toBe('campaign:strahd:storedHeroes');
    expect(STORAGE_KEYS.combatants).toBe('campaign:strahd:storedCombatants');
    expect(STORAGE_KEYS.battleLog).toBe('campaign:strahd:battleLog');
    expect(STORAGE_KEYS.monsters).toBe('storedMonsters');
    expect(STORAGE_KEYS.settings).toBe('appSettings');
  });

  it('stays on the campaign it started with until the page reloads', () => {
    setActive('strahd');
    expect(STORAGE_KEYS.heroes).toBe('campaign:strahd:storedHeroes');
    setActive('phandelver');
    expect(STORAGE_KEYS.heroes).toBe('campaign:strahd:storedHeroes');
  });

  it('writes nothing once dmOS has moved the page to another campaign', () => {
    setActive('strahd');
    storeHeroes([]);
    expect(storage.getItem('campaign:strahd:storedHeroes')).toBe('[]');
    storage.removeItem('campaign:strahd:storedHeroes');
    setActive('other');
    storeHeroes([]);
    expect(storage.getItem('campaign:strahd:storedHeroes')).toBeNull();
  });

  it('ignores an active campaign with a malformed id', () => {
    setActive('../evil');
    expect(readActiveCampaign()).toBeNull();
    expect(STORAGE_KEYS.heroes).toBe('storedHeroes');
  });

  it('clears one campaign without touching the others or the monsters', () => {
    storage.setItem('storedHeroes', '[]');
    storage.setItem('storedMonsters', '[]');
    storage.setItem(campaignKey('storedHeroes', 'strahd'), '[]');
    storage.setItem(campaignKey('savedBattles', 'strahd'), '[]');
    storage.setItem(campaignKey('storedHeroes', 'other'), '[]');

    clearCampaign('strahd');

    expect(storage.keys().sort()).toEqual(['campaign:other:storedHeroes', 'storedHeroes', 'storedMonsters']);
  });

  it('never clears the default campaign', () => {
    storage.setItem('storedHeroes', '[]');
    clearCampaign('default');
    expect(storage.getItem('storedHeroes')).toBe('[]');
  });
});

describe('otherCampaignPhotoIds', () => {
  it("lists other campaigns' battle photos, not the active one's", () => {
    setActive('strahd');
    storage.setItem('campaign:strahd:savedBattles', JSON.stringify([{ id: 'a', photoId: 'mine' }]));
    storage.setItem('savedBattles', JSON.stringify([{ id: 'b', photoId: 'default-photo' }, { id: 'c' }]));
    storage.setItem('campaign:other:savedBattles', JSON.stringify([{ id: 'd', photoId: 'other-photo' }]));
    storage.setItem('campaign:other:storedHeroes', JSON.stringify([{ photoId: 'not-a-battle' }]));

    expect(otherCampaignPhotoIds().sort()).toEqual(['default-photo', 'other-photo']);
  });
});

describe('dmOS bridge', () => {
  const hero = { id: 'h1', name: 'Kessa', player: 'Ana', ac: 15, hp: 30 };

  it('saves a hero into the named campaign and returns the roster', () => {
    const res = handleRequest('saveHero', { campaignId: 'strahd', hero });
    expect(res).toMatchObject({ result: [{ id: 'h1', name: 'Kessa', ac: 15, maxHp: 30, currHp: 30 }] });
    expect(JSON.parse(storage.getItem('campaign:strahd:storedHeroes')!)).toHaveLength(1);
    expect(storage.getItem('storedHeroes')).toBeNull();
  });

  it('replaces a hero with the same id instead of adding another', () => {
    handleRequest('saveHero', { campaignId: 'default', hero });
    handleRequest('saveHero', { campaignId: 'default', hero: { ...hero, ac: 17 } });
    const res = handleRequest('getHeroes', { campaignId: 'default' });
    expect(res).toMatchObject({ result: [{ id: 'h1', ac: 17 }] });
  });

  it('deletes a hero', () => {
    handleRequest('saveHero', { campaignId: 'default', hero });
    expect(handleRequest('deleteHero', { campaignId: 'default', heroId: 'h1' })).toEqual({ result: [] });
  });

  it('refuses bad input instead of writing it', () => {
    expect(handleRequest('saveHero', { campaignId: 'Bad Id', hero })).toHaveProperty('error');
    expect(handleRequest('saveHero', { campaignId: 'default', hero: { name: 'No id' } })).toHaveProperty('error');
    expect(handleRequest('deleteCampaign', { campaignId: 'default' })).toHaveProperty('error');
    expect(handleRequest('nope', {})).toEqual({ error: 'Unknown method nope.' });
    expect(storage.keys()).toEqual([]);
  });

  it('sets the active campaign', () => {
    handleRequest('setActiveCampaign', { id: 'strahd', name: ' Curse of Strahd ' });
    expect(readActiveCampaign()).toEqual({ id: 'strahd', name: 'Curse of Strahd' });
  });

  it('answers only dmOS, and local pages while developing', () => {
    expect(isAllowedOrigin('https://dmos.simulacrumtechnologies.com', false)).toBe(true);
    expect(isAllowedOrigin('http://localhost:5180', false)).toBe(false);
    expect(isAllowedOrigin('http://localhost:5180', true)).toBe(true);
    expect(isAllowedOrigin('https://evil.example', true)).toBe(false);
  });

  it('says which change a storage key is', () => {
    expect(eventFor('storedHeroes')).toEqual({ event: 'heroesChanged', campaignId: 'default' });
    expect(eventFor('campaign:strahd:storedHeroes')).toEqual({ event: 'heroesChanged', campaignId: 'strahd' });
    expect(eventFor('campaign:strahd:storedCombatants')).toEqual({ event: 'battleChanged', campaignId: 'strahd' });
    expect(eventFor('battleLog')).toEqual({ event: 'battleChanged', campaignId: 'default' });
    expect(eventFor('monsterAttacks')).toEqual({ event: 'monstersChanged' });
    expect(eventFor('appSettings')).toBeNull();
    expect(eventFor(null)).toBeNull();
  });
});

describe('dmOS bridge: battles and attacks', () => {
  const combatant = (id: string, type: 'hero' | 'monster', currHp: number, tHp = 0) => ({
    id, name: id === 'g1' ? 'Goblin 1' : 'Kessa', type, currHp, maxHp: currHp, tHp, conditions: [] as string[],
  });
  const seedBattle = (campaign: string, combatants: object[]) => {
    const key = (k: string) => (campaign === 'default' ? k : `campaign:${campaign}:${k}`);
    storage.setItem(key('storedCombatants'), JSON.stringify(combatants));
    storage.setItem(key('roundNumber'), '3');
    storage.setItem(key('currentTurnIndex'), '1');
  };

  it('reads the fight in progress', () => {
    seedBattle('strahd', [combatant('h1', 'hero', 20), combatant('g1', 'monster', 7)]);
    expect(handleRequest('getBattle', { campaignId: 'strahd' })).toMatchObject({
      result: { round: 3, turnIndex: 1, combatants: [{ id: 'h1' }, { id: 'g1' }] },
    });
  });

  it('applies damage temp HP first and logs it like the tracker does', () => {
    seedBattle('default', [combatant('h1', 'hero', 20, 5)]);
    const res = handleRequest('applyDamage', { campaignId: 'default', targetId: 'h1', amount: 8, note: 'Scimitar from Goblin 1' });
    expect(res).toMatchObject({ result: { currHp: 17, tHp: 0 } });
    const log = JSON.parse(storage.getItem('battleLog')!);
    expect(log.map((e: { kind: string }) => e.kind)).toEqual(['damage', 'temp-hp']);
    expect(log[0]).toMatchObject({ who: 'Kessa', amount: 3, from: 20, to: 17, round: 3, detail: 'Scimitar from Goblin 1' });
  });

  it('marks a monster dead when it drops to 0', () => {
    seedBattle('default', [combatant('g1', 'monster', 7)]);
    const res = handleRequest('applyDamage', { campaignId: 'default', targetId: 'g1', amount: 12 });
    expect(res).toMatchObject({ result: { currHp: 0, conditions: ['Dead'] } });
    const kinds = JSON.parse(storage.getItem('battleLog')!).map((e: { kind: string }) => e.kind);
    expect(kinds).toEqual(['damage', 'down']);
  });

  it("sets a combatant's hit points outright, logging it like the HP window", () => {
    seedBattle('default', [combatant('h1', 'hero', 20)]);
    expect(handleRequest('setVitals', { campaignId: 'default', targetId: 'h1', currHp: 0, tHp: 4, note: 'from their sheet' })).toMatchObject({
      result: { currHp: 0, tHp: 4 },
    });
    expect(handleRequest('setVitals', { campaignId: 'default', targetId: 'h1', currHp: 12, tHp: 4 })).toMatchObject({ result: { currHp: 12 } });
    const log = JSON.parse(storage.getItem('battleLog')!);
    expect(log.map((e: { kind: string }) => e.kind)).toEqual(['damage', 'temp-hp', 'down', 'heal', 'revived']);
    expect(log[0]).toMatchObject({ amount: 20, from: 20, to: 0, detail: 'from their sheet' });
    expect(JSON.parse(storage.getItem('battleSync')!).combatants[0]).toMatchObject({ currHp: 12, tHp: 4 });
  });

  it('changes and logs nothing when the vitals are the same, and keeps them in bounds', () => {
    seedBattle('default', [combatant('h1', 'hero', 20)]);
    handleRequest('setVitals', { campaignId: 'default', targetId: 'h1', currHp: 20, tHp: 0 });
    expect(storage.getItem('battleLog')).toBeNull();
    expect(handleRequest('setVitals', { campaignId: 'default', targetId: 'h1', currHp: 99, tHp: -5 })).toMatchObject({ result: { currHp: 20, tHp: 0 } });
    expect(handleRequest('setVitals', { campaignId: 'default', targetId: 'nope', currHp: 3 })).toHaveProperty('error');
  });

  it('refuses damage to nobody, or of nothing sensible', () => {
    seedBattle('default', [combatant('g1', 'monster', 7)]);
    expect(handleRequest('applyDamage', { campaignId: 'default', targetId: 'nope', amount: 3 })).toHaveProperty('error');
    expect(handleRequest('applyDamage', { campaignId: 'default', targetId: 'g1', amount: -3 })).toHaveProperty('error');
  });

  it('keeps a hero\'s class and cleaned-up attacks', () => {
    const hero = {
      id: 'h1', name: 'Kessa', class: 'Rogue',
      attacks: [{ id: 'a1', name: 'Rapier', toHit: '7', damage: [{ dice: '1d8+4', type: 'piercing' }], junk: true }, { name: 'no id' }],
    };
    const res = handleRequest('saveHero', { campaignId: 'default', hero }) as { result: Record<string, unknown>[] };
    expect(res.result[0]).toMatchObject({ class: 'Rogue', attacks: [{ id: 'a1', name: 'Rapier', toHit: 7, damage: [{ dice: '1d8+4', type: 'piercing' }] }] });
    expect((res.result[0].attacks as object[])[0]).not.toHaveProperty('junk');
  });

  it('saves monster attacks by kind, and forgets a kind left with none', () => {
    const attacks = [{ id: 'a1', name: 'Scimitar', toHit: 4, damage: [{ dice: '1d6+2', type: 'slashing' }] }];
    expect(handleRequest('saveMonsterAttacks', { kind: 'Goblin 2', attacks })).toEqual({ result: { goblin: attacks } });
    expect(handleRequest('saveMonsterAttacks', { kind: 'goblin', attacks: [] })).toEqual({ result: {} });
  });
});

describe('dmOS bridge: ending turns', () => {
  const fighter = (id: string, initiative: number, extra: object = {}) => ({
    id, name: id, type: 'hero', initiative, currHp: 10, maxHp: 10, tHp: 0,
    action: false, bonus: false, move: false, reaction: true, conditions: [] as string[], ...extra,
  });
  const seed = (combatants: object[], turnIndex: number, round = 2) => {
    storage.setItem('storedCombatants', JSON.stringify(combatants));
    storage.setItem('currentTurnIndex', String(turnIndex));
    storage.setItem('roundNumber', String(round));
  };
  const stored = () => JSON.parse(storage.getItem('storedCombatants')!) as Record<string, unknown>[];
  const log = () => JSON.parse(storage.getItem('battleLog') ?? '[]') as { kind: string; round: number; detail?: string }[];

  it('marks the acting combatant done and hands the turn to the next', () => {
    seed([fighter('a', 20), fighter('b', 15), fighter('c', 10)], 0);
    expect(handleRequest('endTurn', { campaignId: 'default' })).toMatchObject({ result: { turnIndex: 1, round: 2 } });
    expect(stored()[0]).toMatchObject({ id: 'a', action: true, bonus: true, move: true });
    expect(stored()[1]).toMatchObject({ id: 'b', reaction: false });
    expect(storage.getItem('currentTurnIndex')).toBe('1');
    expect(Number(storage.getItem('turnStartedAt'))).toBeGreaterThan(0);
    expect(log()).toEqual([]);
  });

  it('turns the round over after the last combatant, clearing the boxes and logging it', () => {
    const done = { action: true, bonus: true, move: true };
    seed([fighter('a', 20, done), fighter('b', 15, done), fighter('c', 10)], 2, 3);
    expect(handleRequest('endTurn', { campaignId: 'default' })).toMatchObject({ result: { turnIndex: 0, round: 4 } });
    expect(stored().every((c) => !c.action && !c.bonus && !c.move)).toBe(true);
    expect(storage.getItem('roundNumber')).toBe('4');
    expect(log()).toMatchObject([{ kind: 'round', round: 4 }]);
  });

  it('skips the dead', () => {
    seed([fighter('a', 20), fighter('b', 15, { conditions: ['Dead'] }), fighter('c', 10)], 0);
    expect(handleRequest('endTurn', { campaignId: 'default' })).toMatchObject({ result: { turnIndex: 2 } });
  });

  it('lets a readied action lapse when its owner\'s turn comes round', () => {
    seed([fighter('a', 20), fighter('b', 15, { conditions: ['Ready'] })], 0);
    handleRequest('endTurn', { campaignId: 'default' });
    expect(stored()[1].conditions).toEqual([]);
    expect(log()).toMatchObject([{ kind: 'condition-off', detail: 'Ready' }]);
  });

  it('leaves the whole fight in one snapshot, for a tracker open in another tab', () => {
    seed([fighter('a', 20), fighter('b', 15)], 0);
    handleRequest('endTurn', { campaignId: 'default' });
    const sync = JSON.parse(storage.getItem('battleSync')!);
    expect(sync).toMatchObject({ turnIndex: 1, round: 2, combatants: [{ id: 'a', action: true }, { id: 'b' }] });
    expect(sync.turnStartedAt).toBeGreaterThan(0);

    handleRequest('applyDamage', { campaignId: 'default', targetId: 'b', amount: 4 });
    expect(JSON.parse(storage.getItem('battleSync')!)).toMatchObject({ combatants: [{}, { id: 'b', currHp: 6 }], log: [{ kind: 'damage' }] });
  });

  it('refuses when there is no battle', () => {
    expect(handleRequest('endTurn', { campaignId: 'default' })).toHaveProperty('error');
  });
});

describe('dmOS bridge: patrons only', () => {
  const yes = async () => true;
  const no = async () => false;

  it('refuses a non-supporter everything but hello and getSupporter', async () => {
    expect(await answer('getHeroes', { campaignId: 'default' }, no)).toEqual({
      error: expect.stringContaining('patrons'),
    });
    expect(await answer('hello', {}, no)).toHaveProperty('result');
    expect(await answer('getHeroes', { campaignId: 'default' }, yes)).toEqual({ result: [] });
  });
});

describe("dmOS sign-in, round trip through BattleTracker", () => {
  const ask = (q: string) => new URLSearchParams(q);
  beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()));

  it('remembers a dmOS origin and hands it back once', () => {
    expect(rememberDmosReturn(ask('signin=dmos&return=https://dmos.simulacrumtechnologies.com'), false)).toBe(true);
    expect(takeDmosReturn(false)).toBe('https://dmos.simulacrumtechnologies.com');
    expect(takeDmosReturn(false)).toBeNull();
  });

  it('never sends anybody anywhere else', () => {
    expect(rememberDmosReturn(ask('signin=dmos&return=https://evil.example'), true)).toBe(false);
    expect(rememberDmosReturn(ask('signin=dmos&return=http://localhost:5180'), false)).toBe(false);
    expect(takeDmosReturn(false)).toBeNull();
  });
});

describe('dmOS bridge: the bestiary', () => {
  it('serves the edition BattleTracker is set to, or the one asked for', async () => {
    const asIs = await answer('getBestiary', {}, async () => true);
    expect(asIs).toMatchObject({ result: { edition: '2014', settingsEdition: '2014' } });
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ version: 'twentyTwentyFour' }));
    const set = (await answer('getBestiary', {}, async () => true)) as { result: { edition: string; monsters: { name: string }[] } };
    expect(set.result.edition).toBe('2024');
    expect(set.result.monsters.length).toBeGreaterThan(100);
    expect(await answer('getBestiary', { edition: '2014' }, async () => true)).toMatchObject({ result: { edition: '2014', settingsEdition: '2024' } });
  });

  it('adds monsters to the library, numbered as the Monster Manager numbers them', () => {
    const goblin = { name: 'Goblin', hp: 7, ac: 15, dex: 14, link: 'https://5e.tools/bestiary.html#goblin_mm' };
    handleRequest('addMonsters', { monster: goblin });
    const res = handleRequest('addMonsters', { monster: goblin, count: 2 }) as { result: { added: string[] } };
    expect(res.result.added).toEqual(['Goblin 2', 'Goblin 3']);
    const library = JSON.parse(storage.getItem(STORAGE_KEYS.monsters)!);
    expect(library.map((m: { name: string }) => m.name)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);
    expect(library[0]).toMatchObject({ hp: 7, maxHp: 7, currHp: 7, ac: 15, dex: 14, str: 10, present: true, conditions: [] });
  });

  it('keeps only safe links, and refuses a nameless monster', () => {
    handleRequest('addMonsters', { monster: { name: 'Imp', link: 'javascript:alert(1)' } });
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.monsters)!)[0].link).toBe('');
    expect(handleRequest('addMonsters', { monster: { name: ' ' } })).toHaveProperty('error');
  });
});
