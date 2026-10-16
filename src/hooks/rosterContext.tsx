import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Hero, Monster } from "../types/index";
import {
  getHeroes,
  storeHeroes,
  getMonsters,
  storeMonsters,
  STORAGE_KEYS,
} from "../utils/LocalStorage";
import { normalizeHero, normalizeMonster } from "../utils/roster";

/**
 * One shared copy of the hero and monster rosters.
 *
 * These used to be per-component useState, so BattleTracker, HeroManager,
 * SBPopup and every HeroStatBlockHover row each held their own snapshot and
 * each wrote back to localStorage independently. Edits in one were invisible to
 * the others, which is why the tracker used to call getHeroes() on every single
 * render to work around it.
 */

interface RosterContextType {
  heroes: Hero[];
  setHeroes: React.Dispatch<React.SetStateAction<Hero[]>>;
  monsters: Monster[];
  setMonsters: React.Dispatch<React.SetStateAction<Monster[]>>;
  /** Re-read both rosters from storage — for imports that write it directly. */
  reloadRosters: () => void;
}

const RosterContext = createContext<RosterContextType | null>(null);

function loadHeroes(): Hero[] {
  return getHeroes().map(normalizeHero);
}

function loadMonsters(): Monster[] {
  return getMonsters().map(normalizeMonster);
}

export function RosterProvider({ children }: { children: React.ReactNode }) {
  const [heroes, setHeroes] = useState<Hero[]>(loadHeroes);
  const [monsters, setMonsters] = useState<Monster[]>(loadMonsters);

  // Skip the write-back on the very first run of each effect: that value came
  // straight out of storage, so re-writing it is pure churn.
  const heroesLoaded = useRef(false);
  const monstersLoaded = useRef(false);

  useEffect(() => {
    if (!heroesLoaded.current) {
      heroesLoaded.current = true;
      return;
    }
    storeHeroes(heroes);
  }, [heroes]);

  useEffect(() => {
    if (!monstersLoaded.current) {
      monstersLoaded.current = true;
      return;
    }
    storeMonsters(monsters);
  }, [monsters]);

  const reloadRosters = useCallback(() => {
    setHeroes(loadHeroes());
    setMonsters(loadMonsters());
  }, []);

  // Keep other tabs of the app in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.heroes) setHeroes(loadHeroes());
      if (e.key === STORAGE_KEYS.monsters) setMonsters(loadMonsters());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ heroes, setHeroes, monsters, setMonsters, reloadRosters }),
    [heroes, monsters, reloadRosters]
  );

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

function useRoster(): RosterContextType {
  const context = useContext(RosterContext);
  if (!context) throw new Error("useRoster must be used inside a RosterProvider");
  return context;
}

export const useHeroes = () => {
  const { heroes, setHeroes } = useRoster();
  return { heroes, setHeroes };
};

export const useMonsters = () => {
  const { monsters, setMonsters } = useRoster();
  return { monsters, setMonsters };
};

export const useReloadRosters = () => useRoster().reloadRosters;
