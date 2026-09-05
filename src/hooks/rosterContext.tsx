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

/**
 * Fill in every field a Hero is expected to have. Older saves and imported
 * files predate some of them, and the UI assumes numbers rather than undefined.
 */
export function normalizeHero(h: Partial<Hero> & { id: string; name: string }): Hero {
  const hp = h.hp ?? 10;
  return {
    ...h,
    id: h.id,
    name: h.name,
    player: h.player ?? "",
    hp,
    ac: h.ac ?? 10,
    currHp: h.currHp ?? hp,
    maxHp: h.maxHp ?? hp,
    tHp: h.tHp ?? 0,
    str: h.str ?? 10,
    dex: h.dex ?? 10,
    con: h.con ?? 10,
    int: h.int ?? 10,
    wis: h.wis ?? 10,
    cha: h.cha ?? 10,
    pp: h.pp ?? 10,
    init: h.init ?? 0,
    conditions: h.conditions ?? [],
    present: h.present ?? true,
    link: h.link ?? "",
    notes: h.notes ?? "",
  };
}

/** Same idea for monsters. */
export function normalizeMonster(m: Partial<Monster> & { id: string; name: string }): Monster {
  const hp = m.hp ?? m.maxHp ?? 1;
  return {
    ...m,
    id: m.id,
    name: m.name,
    link: m.link ?? "",
    hp,
    maxHp: m.maxHp ?? hp,
    currHp: m.currHp ?? hp,
    ac: m.ac ?? 10,
    str: m.str ?? 10,
    dex: m.dex ?? 10,
    con: m.con ?? 10,
    int: m.int ?? 10,
    wis: m.wis ?? 10,
    cha: m.cha ?? 10,
    pp: m.pp ?? 0,
    init: m.init ?? 0,
    hidden: m.hidden ?? false,
    present: m.present ?? false,
    conditions: m.conditions ?? [],
  };
}

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
