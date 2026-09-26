import type { Combatant, ExportedData, Hero, Monster, SavedBattle } from "../types/index";

/** The most entries any one list may hold once an import has merged in. */
export const MAX_IMPORT_ENTRIES = 1000;

/** What importing a backup would store, or why it will not. */
export type ImportPlan =
  | { ok: false; title: string; message: string }
  | {
      ok: true;
      /** The rosters and saved battles to store: what was here, plus the file's. */
      heroes: Hero[];
      monsters: Monster[];
      battles: SavedBattle[];
      /** The battle in the file, or [] when it had none. */
      combatants: Combatant[];
      round: number;
      turnIndex: number;
      /** How many of each came from the file, for the summary. */
      added: { heroes: number; monsters: number; battles: number };
    };

type Existing = { heroes: Hero[]; monsters: Monster[]; battles: SavedBattle[] };

const refuse = (title: string, message: string): ImportPlan => ({ ok: false, title, message });

function isGameData(data: unknown): data is Partial<ExportedData> {
  if (data === null || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return "heroes" in d && "combatants" in d && "round" in d && "battles" in d;
}

/** Give anything whose id is already taken here a fresh one. */
function freshIds<T extends { id: string }>(items: T[], existing: { id: string }[]): T[] {
  const taken = new Set(existing.map((e) => e.id));
  return items.map((item) => (taken.has(item.id) ? { ...item, id: crypto.randomUUID() } : item));
}

/**
 * Check a backup file's contents and work out what importing it would store.
 *
 * Pure: nothing is read or written here, so every refusal can be tested. The
 * file is somebody else's as often as the DM's own, so nothing in it is taken
 * on trust — each list must be a list, the round a real number, and the
 * result small enough to keep.
 *
 * The rosters and the saved battles MERGE with what is already here, which is
 * what makes importing safe mid-session. Whether the file's battle replaces
 * the one on the table is the caller's question to ask.
 */
export function planImport(data: unknown, existing: Existing): ImportPlan {
  if (!isGameData(data)) {
    return refuse("Unrecognised file", "That file is missing heroes, combatants, battles or round data.");
  }

  const heroes = Array.isArray(data.heroes) ? data.heroes : null;
  const combatants = Array.isArray(data.combatants) ? data.combatants : null;
  const battles = Array.isArray(data.battles) ? data.battles : null;
  // Monsters are optional so files exported before the fix still load.
  const monsters = Array.isArray(data.monsters) ? data.monsters : [];
  if (!heroes || !combatants || !battles) {
    return refuse("Invalid file", "The heroes, combatants and battles in that file are not lists.");
  }

  const round = data.round;
  if (typeof round !== "number" || round < 0 || !Number.isFinite(round)) {
    return refuse("Invalid file", "That file has an invalid round number.");
  }

  const merged = {
    heroes: [...existing.heroes, ...freshIds(heroes, existing.heroes)],
    monsters: [...existing.monsters, ...freshIds(monsters, existing.monsters)],
    battles: [...existing.battles, ...freshIds(battles, existing.battles)],
  };
  if ([merged.heroes, merged.monsters, combatants, merged.battles].some((list) => list.length > MAX_IMPORT_ENTRIES)) {
    return refuse("Too much data", `That would leave more than ${MAX_IMPORT_ENTRIES} entries in one list.`);
  }

  const turn = typeof data.currentTurnIndex === "number" ? data.currentTurnIndex : 0;
  return {
    ok: true,
    ...merged,
    combatants,
    round,
    turnIndex: Math.min(Math.max(turn, 0), Math.max(combatants.length - 1, 0)),
    added: { heroes: heroes.length, monsters: monsters.length, battles: battles.length },
  };
}

/** What an import did, in the sentence the DM is shown afterwards. */
export function importSummary(
  added: { heroes: number; monsters: number; battles: number },
  battle: "replaced" | "kept" | "none",
): string {
  const battleLine =
    battle === "replaced"
      ? " The battle in the file is now on the table."
      : battle === "kept"
        ? " The battle in the file was left out; yours is untouched."
        : "";
  return `Imported ${added.heroes} heroes, ${added.monsters} monsters and ${added.battles} saved battles.${battleLine}`;
}
