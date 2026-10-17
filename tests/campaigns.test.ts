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
import { eventFor, handleRequest, isAllowedOrigin } from '../src/bridge';

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
