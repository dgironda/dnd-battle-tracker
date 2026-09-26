import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Combatant } from "../../types/index";
import { DEVMODE } from "../../utils/devmode";

interface HpWindowInputs {
  combatants: Combatant[];
  activeCombatant: Combatant | undefined;
  /** Turns taken in the whole battle, so a death save is offered once per turn. */
  totalTurns: number;
  patchCombatant: (combatantId: string, patch: Partial<Combatant>) => void;
}

/**
 * The HP window: which combatant it is open on, opening by itself when it is
 * a dying hero's turn, and spending that turn when it closes.
 */
export function useHpWindow({ combatants, activeCombatant, totalTurns, patchCombatant }: HpWindowInputs) {
  /* Which combatant the HP window is open on — the ID, not a copy of them.
     It used to hold a snapshot taken when the window opened, so editing
     temporary hit points inside it wrote to the real combatant while the
     window went on showing the stale figure: it looked stuck on 0 until you
     closed it. Everything the window shows is read live now, which also keeps
     the death-save tally and the conditions current while it is open. */
  const [hpModalId, setHpModalId] = useState<string | null>(null);
  const processedTurnRef = useRef(-1);

  const hpModalCombatant = useMemo(
    () => (hpModalId === null ? null : combatants.find((c) => c.id === hpModalId) ?? null),
    [combatants, hpModalId]
  );

  // Auto-open HP modal for death saves
  useEffect(() => {
    if (!activeCombatant || hpModalCombatant !== null) return;
    if (processedTurnRef.current === totalTurns) return;

    if (activeCombatant.conditions.includes("Death Saves")) {
      setHpModalId(activeCombatant.id);
      processedTurnRef.current = totalTurns;
      if (DEVMODE) console.log(activeCombatant.name, "needs to make a death saving throw.");
    }
  }, [activeCombatant, hpModalCombatant, totalTurns]);

  const dismissHpWindow = useCallback(() => setHpModalId(null), []);

  /**
   * Close the window. If it opened itself for a death save, the roll was the
   * turn, so it is spent on the way out: done through the setter, not by
   * assigning onto the sorted array. `nextTurn` is passed in because moving
   * the turn needs to know whether this window is open (useTurnFlow).
   */
  const closeHpWindow = useCallback(
    (nextTurn: () => void) => {
      if (processedTurnRef.current === totalTurns && activeCombatant) {
        patchCombatant(activeCombatant.id, { action: true, bonus: true, move: true });
        nextTurn();
      }
      setHpModalId(null);
    },
    [totalTurns, activeCombatant, patchCombatant]
  );

  return { hpModalCombatant, openHpWindow: setHpModalId, dismissHpWindow, closeHpWindow };
}
