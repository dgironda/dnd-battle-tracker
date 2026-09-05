import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InitiativeDialog } from './InitiativeDialog';
import { Hero, Monster, Combatant } from "../../types/index";
import {
  getCombatants,
  getRoundNumber,
  getTurnIndex,
  storeCombatants,
  storeTurnIndex,
} from '../../utils/LocalStorage';
import { useMonsters } from "../../hooks/useMonsters";

interface CombatContextType {
  combatants: Combatant[];
  setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>;
  currentTurnIndex: number;
  setCurrentTurnIndex: (i: number) => void;
  roundNumber: number;
  setRoundNumber: (r: number) => void;
  addMonsterToCombat: (monster: Monster) => Promise<void>;
  currentCombatant: Hero | Monster | null;
  /** Prompt for one combatant's initiative. Rejects if the user cancels. */
  askForInitiative: (entity: Hero | Monster) => Promise<number>;
  /** Abort a pending initiative prompt, rejecting whoever is awaiting it. */
  cancelInitiative: () => void;
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

  // Rejecter paired with the current prompt, so cancelling unwinds the await
  // chain in useBattleManager instead of leaving it hanging forever.
  const initiativeRejecter = useRef<((reason: unknown) => void) | null>(null);

  // Persist on change. This used to be guarded by `combatants.length > 0`,
  // which meant ending a battle left the previous one in storage to be
  // resurrected on the next load.
  useEffect(() => {
    if (combatants.length === 0) return;
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

    setCombatants((prev) =>
      [...prev, newCombatant].sort((a, b) => b.initiative - a.initiative)
    );

    // Remove from the selection pool through the shared roster so the manager
    // updates too. This used to write localStorage directly, leaving every
    // mounted copy of the monster list stale.
    setMonsters((prev) => prev.filter((m) => m.id !== monster.id));
  }, [askForInitiative, setMonsters]);

  const value = useMemo(
    () => ({
      combatants,
      setCombatants,
      currentTurnIndex,
      setCurrentTurnIndex,
      roundNumber,
      setRoundNumber,
      addMonsterToCombat,
      currentCombatant,
      askForInitiative,
      cancelInitiative,
    }),
    [
      combatants,
      currentTurnIndex,
      roundNumber,
      addMonsterToCombat,
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
