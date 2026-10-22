/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Combatant } from '../src/types/index';
import { campaignKey, clearCampaign, unpinCampaign } from '../src/utils/LocalStorage';
import { FightPapers, campaignPaper, type OpenHost, type PaperHost } from '../src/utils/fightPapers';
import { loadRoom } from '../src/utils/playerRoom';
import type { PlayerView } from '../src/utils/playerView';

/* The bridge test below drives the real bridge, so the room connection it
   would open is stood in for here. */
const opened = vi.hoisted(() => [] as { code: string; published: unknown[] }[]);
vi.mock('../src/utils/roomHost', () => ({
  RoomHost: class {
    published: unknown[] = [];
    constructor(room: { code: string }) {
      opened.push({ code: room.code, published: this.published });
    }
    publish(view: unknown) { this.published.push(view); }
    end() { return Promise.resolve(); }
    close() {}
  },
}));

/**
 * Each campaign's initiative paper, kept on its Battle Link room for the
 * sheets linked to it: one room per campaign, published to as the fight
 * changes, and a new link whenever the old one stops working.
 */

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

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

function storeFight(campaignId: string, combatants: Combatant[], round: number, turnIndex: number) {
  localStorage.setItem(campaignKey('storedCombatants', campaignId), JSON.stringify(combatants));
  localStorage.setItem(campaignKey('roundNumber', campaignId), String(round));
  localStorage.setItem(campaignKey('currentTurnIndex', campaignId), String(turnIndex));
}

/** A stand-in connection: what it was asked to publish, and whether it was ended or closed. */
interface FakeHost extends PaperHost {
  code: string;
  views: PlayerView[];
  ended: boolean;
  closed: boolean;
  goAway: () => void;
}

function fakeHosts() {
  const hosts: FakeHost[] = [];
  const open: OpenHost = (room, onGone) => {
    const host: FakeHost = {
      code: room.code,
      views: [],
      ended: false,
      closed: false,
      goAway: onGone,
      publish(view) { host.views.push(view); },
      end() { host.ended = true; },
      close() { host.closed = true; },
    };
    hosts.push(host);
    return host;
  };
  return { hosts, open };
}

const KESSA = combatant('h1', 'Kessa', 18);
const GOBLIN = combatant('m1', 'Goblin 1', 12, { type: 'monster' });
const LURKER = combatant('m2', 'Lurker', 15, { type: 'monster', conditions: ['Invisible'] });

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  unpinCampaign();
  opened.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a campaign paper', () => {
  it('is the Battle Link view of that campaign’s fight', () => {
    storeFight('ember-keep', [GOBLIN, KESSA, LURKER], 2, 1);

    const paper = campaignPaper('ember-keep');

    expect(paper.round).toBe(2);
    /* In initiative order, without the monster the DM has hidden. */
    expect(paper.combatants.map((c) => c.name)).toEqual(['Kessa', 'Goblin 1']);
    /* turnIndex 1 counts the hidden Lurker, as the tracker does: it is the
       Lurker's turn, so nobody on the paper is circled. */
    expect(paper.combatants.some((c) => c.isCurrentTurn)).toBe(false);

    storeFight('ember-keep', [GOBLIN, KESSA, LURKER], 2, 2);
    expect(campaignPaper('ember-keep').combatants.find((c) => c.isCurrentTurn)?.name).toBe('Goblin 1');
  });
});

describe('keeping papers', () => {
  it('gives each campaign its own room, and the same link every time it is asked', () => {
    const { hosts, open } = fakeHosts();
    const papers = new FightPapers(() => {}, open);

    const first = papers.share('ember-keep');
    expect(first).toBe(`${window.location.origin}/play/${loadRoom('ember-keep')!.code}`);
    expect(papers.share('ember-keep')).toBe(first);
    expect(hosts).toHaveLength(1);

    const other = papers.share('salt-marsh');
    expect(other).not.toBe(first);
    expect(localStorage.getItem('campaign:salt-marsh:playerRoomCode')).toBe(loadRoom('salt-marsh')!.code);

    /* The default campaign keeps the keys a room had before campaigns, so a
       link handed out then still works. */
    papers.share('default');
    expect(localStorage.getItem('playerRoomCode')).toBe(loadRoom('default')!.code);
  });

  it('publishes the fight when shared, and again when it changes', () => {
    const { hosts, open } = fakeHosts();
    const papers = new FightPapers(() => {}, open);
    storeFight('ember-keep', [KESSA, GOBLIN], 1, 0);

    papers.share('ember-keep');
    expect(hosts[0].views.at(-1)!.combatants.map((c) => c.name)).toEqual(['Kessa', 'Goblin 1']);

    storeFight('ember-keep', [KESSA, GOBLIN], 1, 1);
    papers.refresh('ember-keep');
    expect(hosts[0].views.at(-1)!.combatants.find((c) => c.isCurrentTurn)?.name).toBe('Goblin 1');

    /* A campaign nobody asked for isn't published at all. */
    papers.refresh('salt-marsh');
    expect(hosts).toHaveLength(1);
  });

  it('asks for a new link when the Battle Manager stops or replaces the room', () => {
    const { hosts, open } = fakeHosts();
    const changed = vi.fn();
    const papers = new FightPapers(changed, open);
    papers.share('ember-keep');

    /* Something unrelated changed: same room, nothing to say. */
    papers.roomChanged('ember-keep');
    expect(changed).not.toHaveBeenCalled();

    /* Stopped: the tracker forgot the room. */
    localStorage.removeItem('campaign:ember-keep:playerRoomCode');
    papers.roomChanged('ember-keep');
    expect(hosts[0].closed).toBe(true);
    expect(changed).toHaveBeenCalledWith('ember-keep');

    /* Asked again, it is a new room with a new link. */
    const next = papers.share('ember-keep');
    expect(hosts).toHaveLength(2);
    expect(next).toContain(hosts[1].code);
    expect(hosts[1].code).not.toBe(hosts[0].code);
  });

  it('forgets a room that ended or refused the key, so the next link is a new one', () => {
    const { hosts, open } = fakeHosts();
    const changed = vi.fn();
    const papers = new FightPapers(changed, open);
    const first = papers.share('ember-keep');

    hosts[0].goAway();

    expect(changed).toHaveBeenCalledWith('ember-keep');
    expect(loadRoom('ember-keep')).toBeNull();
    expect(papers.share('ember-keep')).not.toBe(first);
  });

  it('ends a deleted campaign’s room, so its link stops working', () => {
    const { hosts, open } = fakeHosts();
    const papers = new FightPapers(() => {}, open);
    papers.share('ember-keep');

    papers.forget('ember-keep');
    clearCampaign('ember-keep');

    expect(hosts[0].ended).toBe(true);
    expect(loadRoom('ember-keep')).toBeNull();
  });
});

describe('the bridge', () => {
  it('hands dmOS the link, then keeps the paper up with what dmOS does to the fight', async () => {
    const { handleRequest, BRIDGE_VERSION } = await import('../src/bridge');
    storeFight('ember-keep', [KESSA, GOBLIN], 1, 0);

    expect(BRIDGE_VERSION).toBe(8);
    expect(handleRequest('getFightPaper', {})).toEqual({ error: 'A valid campaignId is required.' });

    const reply = handleRequest('getFightPaper', { campaignId: 'ember-keep' }) as { result: { url: string } };
    const code = loadRoom('ember-keep')!.code;
    expect(reply.result.url).toBe(`${window.location.origin}/play/${code}`);
    const room = opened.find((o) => o.code === code)!;

    /* jFight ends Kessa's turn through the bridge: the paper follows. */
    handleRequest('endTurn', { campaignId: 'ember-keep' });
    const latest = room.published.at(-1) as PlayerView;
    expect(latest.combatants.find((c) => c.isCurrentTurn)?.name).toBe('Goblin 1');
  });
});
