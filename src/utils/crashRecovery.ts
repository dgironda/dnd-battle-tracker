/**
 * The way out of a crash that comes back every time you reload.
 *
 * Everything this app knows lives in localStorage, which means a single bad
 * value in the stored fight can throw on the way up, every single time. Without
 * an escape hatch the only fix a person has is clearing site data for the
 * origin — which takes their heroes, their monsters and every saved battle with
 * it. That is the ungraceful ending worth designing away.
 *
 * So: count the crashes, and once a reload has plainly not helped, offer to
 * clear *only the fight in progress*. Heroes, monsters, saved battles and
 * settings are never touched — those are the things somebody spent evenings on.
 *
 * The count lives in sessionStorage on purpose. It should follow one tab
 * through a couple of reloads and then be gone; a crash last Tuesday should not
 * make today's first crash look like a loop.
 */

import { STORAGE_KEYS } from "./LocalStorage";

const COUNT_KEY = "crashCount";

/** After this many crashes in one tab, we stop suggesting another reload. */
export const LOOP_THRESHOLD = 2;

/**
 * The keys that hold the fight in progress, and nothing else.
 *
 * Deliberately spelled out rather than derived: this list is a promise about
 * what "Clear the current fight" will and will not delete, and it should have
 * to be edited on purpose.
 */
const FIGHT_KEYS = [
  STORAGE_KEYS.combatants,
  STORAGE_KEYS.round,
  STORAGE_KEYS.turnIndex,
  STORAGE_KEYS.turnStart,
  STORAGE_KEYS.battleLog,
];

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    /* Private modes and embedded browsers can refuse it outright. */
    return null;
  }
}

/** Record a crash and return how many this tab has now seen. */
export function noteCrash(): number {
  const store = session();
  if (!store) return 1;
  try {
    const next = readCrashCount() + 1;
    store.setItem(COUNT_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function readCrashCount(): number {
  const store = session();
  if (!store) return 0;
  try {
    const raw = Number(store.getItem(COUNT_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

/**
 * Forget the crashes. Called once the app has drawn itself successfully, so a
 * tab that recovers on its own does not keep offering the escape hatch.
 */
export function clearCrashCount(): void {
  try {
    session()?.removeItem(COUNT_KEY);
  } catch {
    /* nothing to do — the count is advisory */
  }
}

/** True once reloading has visibly stopped helping. */
export function isCrashLoop(count = readCrashCount()): boolean {
  return count > LOOP_THRESHOLD;
}

/**
 * Drop the fight in progress. Returns the keys that were actually removed, so
 * the caller can say what it did rather than claiming more than it deleted.
 */
export function clearCurrentFight(): string[] {
  const removed: string[] = [];
  for (const key of FIGHT_KEYS) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        removed.push(key);
      }
    } catch {
      /* One unreadable key should not stop the rest being cleared. */
    }
  }
  return removed;
}
