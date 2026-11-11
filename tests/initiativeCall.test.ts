import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleRequest } from '../src/bridge';
import { announceTable, readRolls, readTable, ROLLS_KEY } from '../src/utils/initiativeCall';
import { ACTIVE_CAMPAIGN_KEY, unpinCampaign } from '../src/utils/LocalStorage';

/** The initiative table and dmOS: the table says it's open, dmOS's players' rolls come back into it. */

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
  };
}

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  storage.setItem(ACTIVE_CAMPAIGN_KEY, JSON.stringify({ id: 'sunless-vale', name: 'The Sunless Vale' }));
  unpinCampaign();
});

afterEach(() => {
  vi.unstubAllGlobals();
  unpinCampaign();
});

describe('the initiative table, for dmOS', () => {
  it('says when it opens, in which campaign, and which heroes it waits on; and when it closes', () => {
    announceTable(true, ['hero-mira', 'hero-tobin']);
    expect(readTable()).toMatchObject({ campaignId: 'sunless-vale', open: true, heroes: ['hero-mira', 'hero-tobin'] });
    announceTable(false, []);
    expect(readTable()).toMatchObject({ open: false, heroes: [] });
  });

  it("takes the players' totals dmOS sends, for this campaign and since the table opened", () => {
    const opened = Date.now() - 1000;
    expect(handleRequest('setInitiativeRolls', { campaignId: 'sunless-vale', rolls: { 'hero-mira': 17, 'hero-tobin': 4 } })).toEqual({ result: null });
    expect(readRolls(opened)).toEqual({ 'hero-mira': 17, 'hero-tobin': 4 });
    // From before this table opened: some other table's.
    expect(readRolls(Date.now() + 1000)).toEqual({});
    // Another campaign's rolls aren't this table's.
    storage.setItem(ROLLS_KEY, JSON.stringify({ campaignId: 'other', at: Date.now(), rolls: { 'hero-mira': 3 } }));
    expect(readRolls(opened)).toEqual({});
  });

  it('refuses rolls that are not whole-number totals', () => {
    expect(handleRequest('setInitiativeRolls', { campaignId: 'sunless-vale', rolls: { 'hero-mira': 'high' } })).toHaveProperty('error');
    expect(handleRequest('setInitiativeRolls', { campaignId: 'sunless-vale', rolls: { 'hero-mira': 2.5 } })).toHaveProperty('error');
  });
});
