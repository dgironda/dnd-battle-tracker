import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { announceTable, readRolls, ROLLS_KEY } from "../../utils/initiativeCall";
import type { InitiativeEntry } from "./InitiativeTable";

/**
 * The initiative table's link to dmOS: while it's open, dmOS knows (and asks
 * the party for initiative in dmDM), and each player's total fills their
 * hero's box as they roll. A box the DM has typed in or rolled is the DM's:
 * a player's roll never overwrites it, but a newer roll of theirs replaces
 * their own last one.
 */
export function usePlayerRolls(entries: InitiativeEntry[], setValues: Dispatch<SetStateAction<Record<string, string>>>) {
  const openedAt = useRef(Date.now());
  const fromPlayers = useRef(new Set<string>());
  const [, redraw] = useState(0);

  useEffect(() => {
    announceTable(true, entries.filter((e) => e.type === "hero").map((e) => e.id));
    return () => announceTable(false, []);
  }, [entries]);

  useEffect(() => {
    const heroes = entries.filter((e) => e.type === "hero").map((e) => e.id);
    const take = () => {
      const rolls = readRolls(openedAt.current);
      const theirs = heroes.filter((id) => rolls[id] !== undefined);
      if (!theirs.length) return;
      setValues((prev) => {
        const next = { ...prev };
        for (const id of theirs) {
          if ((prev[id] ?? "").trim() !== "" && !fromPlayers.current.has(id)) continue;
          next[id] = String(rolls[id]);
          fromPlayers.current.add(id);
        }
        return next;
      });
      redraw((n) => n + 1);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === ROLLS_KEY) take();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [entries, setValues]);

  return {
    /** Whether this box holds the player's own roll from dmDM. */
    isFromPlayer: (id: string) => fromPlayers.current.has(id),
    /** The DM typed or rolled in these boxes: theirs now. */
    takeOver: (ids: string[]) => ids.forEach((id) => fromPlayers.current.delete(id)),
  };
}
