import { Hero, Monster, Combatant } from '../types/index';

/**
 * Single source of truth for every localStorage key the app uses.
 *
 * These used to be re-declared in Utils.tsx, monsterShareURL.tsx and twice in
 * BattleManager.tsx. One of those copies spelled the round key "roundnumber"
 * while the reader used "roundNumber", so imported battles silently lost their
 * round. Import these constants instead of typing the strings again.
 */
export const STORAGE_KEYS = {
  heroes: "storedHeroes",
  monsters: "storedMonsters",
  combatants: "storedCombatants",
  round: "roundNumber",
  turnIndex: "currentTurnIndex",
  settings: "appSettings",
  savedBattles: "savedBattles",
} as const;

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

function hasKey(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking ${key}:`, error);
    return false;
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

function hasStoredHeroes(): boolean {
  return hasKey(STORAGE_KEYS.heroes);
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

function hasStoredMonsters(): boolean {
  return hasKey(STORAGE_KEYS.monsters);
}

/* -------------------------------------------------------------- combatants */

function storeCombatants(combatants: Combatant[], round: number): void {
  writeKey(STORAGE_KEYS.combatants, JSON.stringify(combatants ?? []));
  writeKey(STORAGE_KEYS.round, round.toString());
}

function getCombatants(): Combatant[] {
  return readJSON<Combatant[]>(STORAGE_KEYS.combatants, []);
}

function storeRoundNumber(round: number): void {
  writeKey(STORAGE_KEYS.round, round.toString());
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

function clearCombatants(): void {
  removeKey(STORAGE_KEYS.combatants);
  removeKey(STORAGE_KEYS.round);
  removeKey(STORAGE_KEYS.turnIndex);
}

function hasStoredCombatants(): boolean {
  return hasKey(STORAGE_KEYS.combatants);
}

export {
  storeHeroes,
  getHeroes,
  clearHeroes,
  hasStoredHeroes,
  storeMonsters,
  getMonsters,
  clearMonsters,
  hasStoredMonsters,
  storeCombatants,
  getCombatants,
  getRoundNumber,
  storeRoundNumber,
  getTurnIndex,
  storeTurnIndex,
  clearCombatants,
  hasStoredCombatants,
};
