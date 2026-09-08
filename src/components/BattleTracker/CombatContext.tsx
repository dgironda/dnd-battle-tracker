import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InitiativeDialog } from './InitiativeDialog';
import { Hero, Monster, Combatant } from "../../types/index";
import {
  getCombatants,
  getRoundNumber,
  getTurnIndex,
  storeCombatants,
  storeTurnIndex,
  getBattleLog,
  storeBattleLog,
} from '../../utils/LocalStorage';
import { appendEntry, makeEntry, type LogEntry, type LogKind } from '../../utils/battleLog';
import { useMonsters } from "../../hooks/useMonsters";

interface CombatContextType {
  combatants: Combatant[];
  setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
  currentTurnIndex: number;
  setCurrentTurnIndex: (i: number) => void;
  roundNumber: number;
  setRoundNumber: (r: number) => void;
  addMonsterToCombat: (monster: Monster) => Promise<void>;
  addHeroToCombat: (hero: Hero) => Promise<void>;
  currentCombatant: Hero | Monster | null;
  /** Prompt for one combatant's initiative. Rejects if the user cancels. */
  askForInitiative: (entity: Hero | Monster) => Promise<number>;
  /** Abort a pending initiative prompt, rejecting whoever is awaiting it. */
  cancelInitiative: () => void;

  /** What has happened this battle, oldest first. */
  battleLog: LogEntry[];
  /**
   * Record something. Called at the point the thing happens rather than
   * inferred from a state diff — see utils/battleLog.ts for why.
   */
  logEvent: (
    kind: LogKind,
    who: string,
    extra?: Partial<Pick<LogEntry, "amount" | "from" | "to" | "detail">>,
  ) => void;
  /**
   * Wipe the log. Called when the battle is cleared — the record belongs to
   * the fight, and leaving it would put the last battle's history behind the
   * next battle's button.
   */
  clearBattleLog: () => void;
  /** Clear the battle and wipe the saved copy. */
}

const CombatContext = createContext<CombatContextType | null>(null);

/** Thrown into the start-battle loop when the user cancels an initiative roll. */
export const INITIATIVE_CANCELLED = "INITIATIVE_CANCELLED";

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const { setMonsters } = useMonsters();

  const [combatants, setCombatants] = useState<Combatant[]>(() => getCombatants() || []);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(() => getTurnIndex());
  const [roundNumber, setRoundNumber] = useState(() => getRoundNumber());
  const [currentCombatant, setCurrentCombatant] = useState<Hero | Monster | null>(null);
  const [initiativeResolver, setInitiativeResolver] = useState<((init: number) => void) | null>(null);
  const [battleLog, setBattleLog] = useState<LogEntry[]>(() => getBattleLog());

  /* The round is read through a ref rather than taken as a dependency: every
     log call would otherwise rebuild `logEvent`, and every consumer of the
     context with it, on each turn. */
  const roundRef = useRef(0);

  // Rejecter paired with the current prompt, so cancelling unwinds the await
  // chain in useBattleManager instead of leaving it hanging forever.
  const initiativeRejecter = useRef<((reason: unknown) => void) | null>(null);

  /* Kept current every render, so logEvent can stamp the round without taking
     it as a dependency. */
  roundRef.current = roundNumber;

  const logEvent = useCallback<CombatContextType["logEvent"]>((kind, who, extra) => {
    setBattleLog((prev) => appendEntry(prev, makeEntry(kind, who, roundRef.current, extra)));
  }, []);

  const clearBattleLog = useCallback(() => setBattleLog([]), []);

  useEffect(() => {
    storeBattleLog(battleLog);
  }, [battleLog]);

  /* A heading whenever the round turns over.
     `lastLoggedRound` starts at whatever was restored, so reloading mid-fight
     does not stamp the round you are already in a second time. Round 0 is the
     no-battle state and is never a heading. */
  const lastLoggedRound = useRef<number | null>(null);
  useEffect(() => {
    if (lastLoggedRound.current === null) {
      lastLoggedRound.current = roundNumber;
      return;
    }
    if (roundNumber > lastLoggedRound.current && roundNumber > 0) {
      logEvent("round", "");
    }
    lastLoggedRound.current = roundNumber;
  }, [roundNumber, logEvent]);

  // Persist on change.
  //
  // The `combatants.length === 0` guard that used to sit here was described in
  // this comment as already removed, but was still in the code — so ending a
  // battle wrote nothing, and the old one came back on the next load. Clearing
  // a battle looked like it worked right up until you refreshed.
  //
  // Nothing needs the guard: `combatants` is seeded FROM storage, so the first
  // run after mount writes back exactly what it read either way.
  useEffect(() => {
    storeTurnIndex(currentTurnIndex);
    storeCombatants(combatants, roundNumber);
  }, [combatants, currentTurnIndex, roundNumber]);

  const cancelInitiative = useCallback(() => {
    const reject = initiativeRejecter.current;
    initiativeRejecter.current = null;
    setInitiativeResolver(null);
    setCurrentCombatant(null);
    reject?.(INITIATIVE_CANCELLED);
  }, []);

  const askForInitiative = useCallback((entity: Hero | Monster): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      initiativeRejecter.current = reject;
      setCurrentCombatant(entity);
      setInitiativeResolver(() => resolve);
    });
  }, []);

  /**
   * Adds a monster into an *existing combat*, with initiative dialog
   */
  const addMonsterToCombat = useCallback(async (monster: Monster) => {
    if (!monster) return;

    let initiative: number;
    try {
      initiative = await askForInitiative(monster);
    } catch {
      return; // cancelled - leave the monster in the manager
    }

    const newCombatant: Combatant = {
      id: monster.id,
      name: monster.name,
      link: monster.link,
      type: 'monster',
      currHp: monster.hp,
      maxHp: monster.hp,
      tHp: 0,
      initiative,
      action: false,
      bonus: false,
      move: false,
      reaction: false,
      conditions: monster.conditions ?? [],
      init: monster.init,
      deathsaves: [],
      ac: monster.ac,
      str: monster.str,
      dex: monster.dex,
      con: monster.con,
      int: monster.int,
      wis: monster.wis,
      cha: monster.cha,
      pp: monster.pp,
    };

    logEvent("joined", newCombatant.name);

    setCombatants((prev) =>
      [...prev, newCombatant].sort((a, b) => b.initiative - a.initiative)
    );

    // Remove from the selection pool through the shared roster so the manager
    // updates too. This used to write localStorage directly, leaving every
    // mounted copy of the monster list stale.
    setMonsters((prev) => prev.filter((m) => m.id !== monster.id));
  }, [askForInitiative, setMonsters, logEvent]);

  /**
   * Adds a hero into an *existing combat*, with the initiative dialog.
   *
   * Unlike a monster, a hero is NOT taken off the roster afterwards: the party
   * is a standing list that outlives any one fight, where a monster in the
   * manager is stock waiting to be spent. The guard below is what replaces
   * that removal — a hero already in the fight cannot join it twice.
   */
  const addHeroToCombat = useCallback(async (hero: Hero) => {
    if (!hero) return;
    if (combatants.some((c) => c.id === hero.id)) return;

    let initiative: number;
    try {
      initiative = await askForInitiative(hero);
    } catch {
      return; // cancelled
    }

    const newCombatant: Combatant = {
      id: hero.id,
      name: hero.name,
      link: hero.link,
      type: 'hero',
      currHp: hero.currHp ?? hero.hp,
      maxHp: hero.maxHp ?? hero.hp,
      tHp: hero.tHp ?? 0,
      initiative,
      action: false,
      bonus: false,
      move: false,
      reaction: false,
      conditions: hero.conditions ?? [],
      init: hero.init,
      deathsaves: [],
      ac: hero.ac,
      str: hero.str,
      dex: hero.dex,
      con: hero.con,
      int: hero.int,
      wis: hero.wis,
      cha: hero.cha,
      pp: hero.pp,
    };

    logEvent("joined", newCombatant.name);

    setCombatants((prev) =>
      prev.some((c) => c.id === hero.id)
        ? prev
        : [...prev, newCombatant].sort((a, b) => b.initiative - a.initiative)
    );
  }, [askForInitiative, combatants, logEvent]);

  const value = useMemo(
    () => ({
      combatants,
      setCombatants,
      currentTurnIndex,
      setCurrentTurnIndex,
      roundNumber,
      setRoundNumber,
      addMonsterToCombat,
      addHeroToCombat,
      currentCombatant,
      askForInitiative,
      cancelInitiative,
      battleLog,
      logEvent,
      clearBattleLog,
    }),
    [
      combatants,
      currentTurnIndex,
      roundNumber,
      battleLog,
      logEvent,
      clearBattleLog,
      addMonsterToCombat,
      addHeroToCombat,
      currentCombatant,
      askForInitiative,
      cancelInitiative,
    ]
  );

  return (
    <CombatContext.Provider value={value}>
      {children}

      {/*
        The single initiative prompt for the whole app. BattleTracker used to
        render a second one off its own local state, so two dialogs existed for
        the same job.
      */}
      {initiativeResolver && currentCombatant && (
        <InitiativeDialog
          combatantName={currentCombatant.name}
          initiativeModifier={currentCombatant.init || 0}
          onSubmit={(initiative: number) => {
            initiativeRejecter.current = null;
            const resolve = initiativeResolver;
            setInitiativeResolver(null);
            setCurrentCombatant(null);
            resolve(initiative);
          }}
          onCancel={cancelInitiative}
        />
      )}
    </CombatContext.Provider>
  );
}

export function useCombat() {
  const context = useContext(CombatContext);
  if (!context) throw new Error('useCombat must be used inside CombatProvider');
  return context;
}
