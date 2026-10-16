import { Hero, Monster, Combatant } from '../types/index';
import type { LogEntry } from "./battleLog";

/**
 * Single source of truth for every localStorage key the app uses.
 *
 * These used to be re-declared in Utils.tsx, monsterShareURL.tsx and twice in
 * BattleManager.tsx. One of those copies spelled the round key "roundnumber"
 * while the reader used "roundNumber", so imported battles silently lost their
 * round. Import these constants instead of typing the strings again.
 *
 * Most of them belong to a campaign (see below), so they are getters: each one
 * names the active campaign's copy. The monster library and the settings are
 * shared by every campaign.
 */
export const STORAGE_KEYS = {
  get heroes() { return activeKey("storedHeroes"); },
  monsters: "storedMonsters",
  get combatants() { return activeKey("storedCombatants"); },
  get round() { return activeKey("roundNumber"); },
  get turnIndex() { return activeKey("currentTurnIndex"); },
  get turnStart() { return activeKey("turnStartedAt"); },
  settings: "appSettings",
  get savedBattles() { return activeKey("savedBattles"); },
  get battleLog() { return activeKey("battleLog"); },
};

/* --------------------------------------------------------------- campaigns */

/**
 * A DM running several games keeps each one's party and fights apart. dmOS
 * picks the campaign (through the bridge, src/bridge.ts) and BattleTracker
 * follows it. The list of campaigns lives in dmOS; all BattleTracker keeps is
 * which one is active, and each campaign's data.
 *
 * The default campaign's data sits under the original, unprefixed keys, so
 * everything saved before campaigns existed is simply the default campaign,
 * and somebody who never opens dmOS never sees a difference.
 */
export interface CampaignRef {
  id: string;
  name: string;
}

export const DEFAULT_CAMPAIGN_ID = "default";
export const ACTIVE_CAMPAIGN_KEY = "activeCampaign";
const CAMPAIGN_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** The keys each campaign keeps its own copy of, by their unprefixed names. */
const CAMPAIGN_SCOPED = [
  "storedHeroes",
  "storedCombatants",
  "roundNumber",
  "currentTurnIndex",
  "turnStartedAt",
  "savedBattles",
  "battleLog",
];

export function isCampaignId(id: unknown): id is string {
  return typeof id === "string" && CAMPAIGN_ID.test(id);
}

/** Where `campaignId` keeps `baseKey`. */
export function campaignKey(baseKey: string, campaignId: string): string {
  return campaignId === DEFAULT_CAMPAIGN_ID ? baseKey : `campaign:${campaignId}:${baseKey}`;
}

/** The campaign dmOS last chose, or null if it never has. */
export function readActiveCampaign(): CampaignRef | null {
  const stored = readJSON<Partial<CampaignRef> | null>(ACTIVE_CAMPAIGN_KEY, null);
  if (!stored || !isCampaignId(stored.id)) return null;
  return { id: stored.id, name: typeof stored.name === "string" ? stored.name : stored.id };
}

export function storeActiveCampaign(campaign: CampaignRef): void {
  writeKey(ACTIVE_CAMPAIGN_KEY, JSON.stringify(campaign));
}

/**
 * The campaign this page works in, fixed when it is first asked for.
 *
 * Fixed on purpose. The app holds the roster and the fight in memory and
 * writes them back as they change; if the keys moved under it mid-session it
 * would write one campaign's party into another's. A switch reloads the page
 * instead (see reloadOnCampaignSwitch).
 */
let pinnedCampaignId: string | null = null;

function activeKey(baseKey: string): string {
  pinnedCampaignId ??= readActiveCampaign()?.id ?? DEFAULT_CAMPAIGN_ID;
  return campaignKey(baseKey, pinnedCampaignId);
}

/** Reload the page when dmOS (in another frame or tab) switches campaign. */
export function reloadOnCampaignSwitch(): void {
  window.addEventListener("storage", (e) => {
    if (e.key !== ACTIVE_CAMPAIGN_KEY || pinnedCampaignId === null) return;
    const next = readActiveCampaign()?.id ?? DEFAULT_CAMPAIGN_ID;
    if (next !== pinnedCampaignId) window.location.reload();
  });
}

/** Forget the pinned campaign so the next key read looks again. For tests. */
export function unpinCampaign(): void {
  pinnedCampaignId = null;
}

/** Delete everything a campaign kept. The default campaign can't be deleted. */
export function clearCampaign(campaignId: string): void {
  if (campaignId === DEFAULT_CAMPAIGN_ID) return;
  for (const key of CAMPAIGN_SCOPED) removeKey(campaignKey(key, campaignId));
}

/**
 * The photo ids that saved battles in every *other* campaign point at.
 *
 * Photos live in one IndexedDB store for all campaigns, and the Battle Manager
 * sweeps out any photo its battles don't use. It only sees the active
 * campaign's battles, so without these it would delete every other
 * campaign's photos.
 */
export function otherCampaignPhotoIds(): string[] {
  const active = STORAGE_KEYS.savedBattles;
  const ids: string[] = [];
  let keys: string[] = [];
  try {
    keys = Object.keys(localStorage);
  } catch {
    return ids;
  }
  for (const key of keys) {
    if (key === active || !/^(campaign:[a-z0-9-]+:)?savedBattles$/.test(key)) continue;
    const battles = readJSON<unknown>(key, []);
    if (!Array.isArray(battles)) continue;
    for (const battle of battles) {
      if (typeof battle?.photoId === "string") ids.push(battle.photoId);
    }
  }
  return ids;
}

/** Any campaign's heroes, not just the active one's: the bridge edits them. */
export function getCampaignHeroes(campaignId: string): Hero[] {
  return readJSON<Hero[]>(campaignKey("storedHeroes", campaignId), []);
}

export function storeCampaignHeroes(campaignId: string, heroes: Hero[]): void {
  writeKey(campaignKey("storedHeroes", campaignId), JSON.stringify(heroes));
}

/** Raised when a write fails because the origin's storage quota is full. */
export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22
  );
}

/**
 * Write to localStorage, converting a full-quota failure into a typed error
 * callers can catch and report. Any other failure is logged and swallowed so a
 * blocked-storage browser doesn't take the whole app down.
 */
export function writeKey(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (isQuotaError(error)) {
      throw new StorageQuotaError(
        "Your browser's storage is full. Delete a saved battle — especially one with a photo — and try again."
      );
    }
    console.error(`Error writing ${key}:`, error);
  }
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return fallback;
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing ${key}:`, error);
  }
}

function readInt(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ heroes */

function storeHeroes(heroes: Hero[]): void {
  writeKey(STORAGE_KEYS.heroes, JSON.stringify(heroes ?? []));
}

function getHeroes(): Hero[] {
  return readJSON<Hero[]>(STORAGE_KEYS.heroes, []);
}

function clearHeroes(): void {
  removeKey(STORAGE_KEYS.heroes);
}

/* ---------------------------------------------------------------- monsters */

function storeMonsters(monsters: Monster[]): void {
  writeKey(STORAGE_KEYS.monsters, JSON.stringify(monsters ?? []));
}

function getMonsters(): Monster[] {
  return readJSON<Monster[]>(STORAGE_KEYS.monsters, []);
}

function clearMonsters(): void {
  removeKey(STORAGE_KEYS.monsters);
}

/* -------------------------------------------------------------- combatants */

function storeCombatants(combatants: Combatant[], round: number): void {
  writeKey(STORAGE_KEYS.combatants, JSON.stringify(combatants ?? []));
  writeKey(STORAGE_KEYS.round, round.toString());
}

function getCombatants(): Combatant[] {
  return readJSON<Combatant[]>(STORAGE_KEYS.combatants, []);
}

function getRoundNumber(): number {
  return readInt(STORAGE_KEYS.round, 0);
}

function storeTurnIndex(index: number): void {
  writeKey(STORAGE_KEYS.turnIndex, index.toString());
}

function getTurnIndex(): number {
  const parsed = readInt(STORAGE_KEYS.turnIndex, 0);
  return parsed >= 0 ? parsed : 0;
}

/**
 * When the current turn began, as an epoch millisecond stamp.
 *
 * The round number and the turn pointer were already persisted but this was
 * not, so reloading mid-fight put the turn timer back to "Advance the turn to
 * start the timer" while the rest of the battle carried on where it left off.
 */
function storeTurnStart(startedAt: number | null): void {
  if (startedAt === null) {
    removeKey(STORAGE_KEYS.turnStart);
    return;
  }
  writeKey(STORAGE_KEYS.turnStart, startedAt.toString());
}

function getTurnStart(): number | null {
  const parsed = readInt(STORAGE_KEYS.turnStart, 0);
  // A stamp in the future is a clock change, not a turn — start again.
  return parsed > 0 && parsed <= Date.now() ? parsed : null;
}

/* ---------------------------------------------------------------- the log */

/**
 * What happened during this battle.
 *
 * Stored beside the combatants rather than inside them: it belongs to the
 * fight, not to any one person in it, and a combatant who leaves should not
 * take the record of what they did with them.
 */
function storeBattleLog(log: LogEntry[]): void {
  writeKey(STORAGE_KEYS.battleLog, JSON.stringify(log ?? []));
}

function getBattleLog(): LogEntry[] {
  return readJSON<LogEntry[]>(STORAGE_KEYS.battleLog, []);
}

function clearCombatants(): void {
  removeKey(STORAGE_KEYS.combatants);
  removeKey(STORAGE_KEYS.round);
  removeKey(STORAGE_KEYS.turnIndex);
  removeKey(STORAGE_KEYS.turnStart);
  /* The log goes with the battle. Keeping it would put the last fight's
     history behind the next fight's button. */
  removeKey(STORAGE_KEYS.battleLog);
}

export {
  storeHeroes,
  getHeroes,
  clearHeroes,
  storeMonsters,
  getMonsters,
  clearMonsters,
  storeCombatants,
  getCombatants,
  storeBattleLog,
  getBattleLog,
  getRoundNumber,
  getTurnIndex,
  storeTurnIndex,
  getTurnStart,
  storeTurnStart,
  clearCombatants,
};
