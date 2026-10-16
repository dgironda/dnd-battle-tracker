import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  STORAGE_KEYS,
  ACTIVE_CAMPAIGN_KEY,
  campaignKey,
  clearCampaign,
  otherCampaignPhotoIds,
  readActiveCampaign,
  unpinCampaign,
} from '../src/utils/LocalStorage';
import { handleRequest, heroesKeyCampaign, isAllowedOrigin } from '../src/bridge';

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

  it('recognises which campaign a heroes key belongs to', () => {
    expect(heroesKeyCampaign('storedHeroes')).toBe('default');
    expect(heroesKeyCampaign('campaign:strahd:storedHeroes')).toBe('strahd');
    expect(heroesKeyCampaign('storedMonsters')).toBeNull();
    expect(heroesKeyCampaign(null)).toBeNull();
  });
});
