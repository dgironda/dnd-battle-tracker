/**
 * The dmOS bridge: bridge.html, loaded by dmOS in a hidden frame.
 *
 * dmOS runs on its own origin, so it can't read BattleTracker's storage. It
 * asks this page instead, which runs on BattleTracker's origin and so reads
 * and writes the real thing: BattleTracker stays the source of truth for the
 * party, and dmOS never keeps a copy of its own.
 *
 * Messages are plain objects tagged `dmos: 1`:
 *   dmOS -> bridge  { dmos: 1, id, method, params }
 *   bridge -> dmOS  { dmos: 1, id, result } or { dmos: 1, id, error }
 *   bridge -> dmOS  { dmos: 1, event: "heroesChanged", campaignId }
 *
 * The open BattleTracker app needs no telling: it already reloads its roster
 * on the `storage` event these writes fire (hooks/rosterContext.tsx), and
 * reloads itself when the active campaign changes (reloadOnCampaignSwitch).
 */

import type { Hero } from "./types/index";
import {
  campaignKey,
  clearCampaign,
  DEFAULT_CAMPAIGN_ID,
  getCampaignHeroes,
  isCampaignId,
  readActiveCampaign,
  storeActiveCampaign,
  storeCampaignHeroes,
} from "./utils/LocalStorage";
import { normalizeHero } from "./utils/roster";

/** Bumped when a method changes shape, so dmOS can tell what it's talking to. */
export const BRIDGE_VERSION = 1;

const DMOS_ORIGINS = ["https://dmos.simulacrumtechnologies.com"];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Only dmOS may ask; any local origin may too while developing. */
export function isAllowedOrigin(origin: string, dev: boolean): boolean {
  return DMOS_ORIGINS.includes(origin) || (dev && LOCAL_ORIGIN.test(origin));
}

type Params = Record<string, unknown>;

function campaignParam(params: Params): string {
  const id = params.campaignId;
  if (!isCampaignId(id)) throw new Error("A valid campaignId is required.");
  return id;
}

function heroParam(params: Params): Hero {
  const hero = params.hero as Partial<Hero> | undefined;
  if (!hero || typeof hero.id !== "string" || !hero.id || typeof hero.name !== "string") {
    throw new Error("A hero needs an id and a name.");
  }
  return normalizeHero(hero as Partial<Hero> & { id: string; name: string });
}

const METHODS: Record<string, (params: Params) => unknown> = {
  hello: () => ({ version: BRIDGE_VERSION, activeCampaign: readActiveCampaign() }),

  getHeroes: (params) => getCampaignHeroes(campaignParam(params)).map(normalizeHero),

  /** Add the hero, or replace the one with the same id. Returns the roster. */
  saveHero: (params) => {
    const campaignId = campaignParam(params);
    const hero = heroParam(params);
    const heroes = getCampaignHeroes(campaignId);
    const at = heroes.findIndex((h) => h.id === hero.id);
    if (at === -1) heroes.push(hero);
    else heroes[at] = hero;
    storeCampaignHeroes(campaignId, heroes);
    return heroes.map(normalizeHero);
  },

  deleteHero: (params) => {
    const campaignId = campaignParam(params);
    const heroes = getCampaignHeroes(campaignId).filter((h) => h.id !== params.heroId);
    storeCampaignHeroes(campaignId, heroes);
    return heroes.map(normalizeHero);
  },

  setActiveCampaign: (params) => {
    const id = campaignParam({ campaignId: params.id });
    const name = typeof params.name === "string" && params.name.trim() ? params.name.trim() : id;
    storeActiveCampaign({ id, name });
    return null;
  },

  deleteCampaign: (params) => {
    const campaignId = campaignParam(params);
    if (campaignId === DEFAULT_CAMPAIGN_ID) throw new Error("The default campaign can't be deleted.");
    clearCampaign(campaignId);
    return null;
  },
};

/** Run one request. Exported for the tests; the page wires it to `message`. */
export function handleRequest(method: unknown, params: unknown): { result: unknown } | { error: string } {
  const run = typeof method === "string" ? METHODS[method] : undefined;
  if (!run) return { error: `Unknown method ${String(method)}.` };
  try {
    return { result: run((params ?? {}) as Params) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** Which campaign a storage key holds heroes for, if it holds heroes at all. */
export function heroesKeyCampaign(key: string | null): string | null {
  if (key === campaignKey("storedHeroes", DEFAULT_CAMPAIGN_ID)) return DEFAULT_CAMPAIGN_ID;
  const match = key?.match(/^campaign:([a-z0-9-]+):storedHeroes$/);
  return match ? match[1] : null;
}

function start(): void {
  // Only meaningful inside dmOS's frame; opened on its own it does nothing.
  if (window.parent === window) return;
  let dmosOrigin: string | null = null;

  window.addEventListener("message", (e: MessageEvent) => {
    if (e.source !== window.parent || !isAllowedOrigin(e.origin, import.meta.env.DEV)) return;
    const msg = e.data as { dmos?: unknown; id?: unknown; method?: unknown; params?: unknown };
    if (msg?.dmos !== 1 || typeof msg.id !== "number") return;
    dmosOrigin = e.origin;
    window.parent.postMessage({ dmos: 1, id: msg.id, ...handleRequest(msg.method, msg.params) }, e.origin);
  });

  // Edits made in BattleTracker itself (another tab, or its window in dmOS).
  window.addEventListener("storage", (e) => {
    const campaignId = heroesKeyCampaign(e.key);
    if (campaignId && dmosOrigin) {
      window.parent.postMessage({ dmos: 1, event: "heroesChanged", campaignId }, dmosOrigin);
    }
  });
}

if (typeof window !== "undefined") start();
