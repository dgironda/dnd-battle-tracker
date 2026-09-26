import { useCallback, useEffect } from "react";
import type { Combatant } from "../../types/index";
import { READIED_CONDITION } from "../../constants/Conditions";
import { DEVMODE } from "../../utils/devmode";
import type { useCombat } from "./CombatContext";

type Combat = ReturnType<typeof useCombat>;

interface TurnFlow
  extends Pick<
    Combat,
    "combatants" | "setCombatants" | "currentTurnIndex" | "setCurrentTurnIndex" | "roundNumber" | "setRoundNumber" | "logEvent"
  > {
  /** The fight in initiative order, which is the order turns go in. */
  sortedCombatants: Combatant[];
  /** currentTurnIndex, clamped to the list. */
  safeTurnIndex: number;
  activeCombatant: Combatant | undefined;
  /** While the HP window is open the turn waits for it. */
  hpWindowOpen: boolean;
  /** Restarts the turn timer. */
  setLastRun: (startedAt: number | null) => void;
  patchCombatant: (combatantId: string, patch: Partial<Combatant>) => void;
}

/**
 * Moving the turn along: the Next Turn step itself, the things that move it
 * without anybody pressing anything — the dead being skipped, all three boxes
 * ticked, a box unticked — and keeping it on the right person when somebody
 * leaves the fight. Returns the step and the removal, for the places that
 * take them by hand.
 */
export function useTurnFlow({
  combatants,
  setCombatants,
  currentTurnIndex,
  setCurrentTurnIndex,
  roundNumber,
  setRoundNumber,
  logEvent,
  sortedCombatants,
  safeTurnIndex,
  activeCombatant,
  hpWindowOpen,
  setLastRun,
  patchCombatant,
}: TurnFlow) {
  const handleNextTurn = useCallback(() => {
    setLastRun(Date.now());

    if (sortedCombatants.length === 0) return;

    const livingIndices = sortedCombatants
      .map((c, idx) => ({ combatant: c, index: idx }))
      .filter(({ combatant }) => !combatant.conditions.includes("Dead"))
      .map(({ index }) => index);

    if (livingIndices.length === 0) {
      if (DEVMODE) console.warn("All combatants are dead. Battle is over.");
      return;
    }

    // Where the current combatant sits among the living. If they just died they
    // are not in the list at all, so fall back to the next living index after
    // them rather than snapping to the top of the order.
    let nextPosition: number;
    const currentPosition = livingIndices.indexOf(safeTurnIndex);
    if (currentPosition === -1) {
      const after = livingIndices.findIndex((i) => i > safeTurnIndex);
      nextPosition = after === -1 ? 0 : after;
    } else {
      nextPosition = (currentPosition + 1) % livingIndices.length;
    }

    const nextIndex = livingIndices[nextPosition];
    // A new round starts only when we actually wrap past the end of the order.
    const isNewRound = nextPosition === 0;

    /* A readied action is held for a trigger "before the start of your next
       turn", so the chip comes off at exactly the moment the reaction refreshes
       below — not at the top of the round, and not while somebody else acts.
       Read out here, and logged after the update, because the updater runs
       twice under StrictMode and a log entry is a side effect. */
    const startingTurn = sortedCombatants[nextIndex];
    const readiedExpired = startingTurn?.conditions.includes(READIED_CONDITION) ?? false;

    setCombatants((prev) =>
      prev
        .map((c) => {
          if (c.conditions.includes("Dead")) return c;

          let next = c;

          // Action, bonus and move are cleared once a round, when the order
          // wraps — never on entering a turn. Clearing them on entry meant
          // that stepping back to an earlier combatant (done by unticking one
          // of their boxes, which hands the turn back) and then coming forward
          // again wiped whatever the later combatant had already marked. The
          // marks are the DM's record of what has happened this round, so they
          // survive moving around in it.
          if (isNewRound) {
            next = { ...next, action: false, bonus: false, move: false };
          }

          // A reaction refreshes at the start of its owner's turn, which is
          // the rule as written — and ONLY then. It is not part of the
          // walk-the-order record above, and nothing hands the turn back on
          // the strength of it.
          //
          // It used to be cleared in the round-wrap branch as well, for
          // everybody, and that branch returned early. So a combatant who took
          // an opportunity attack after their own turn got the reaction back
          // at the top of the next round, before their turn came round again:
          // Brannoc acts, spends his reaction on Cressa's turn, and has it
          // back while Aldric is still opening round two. No early return
          // now, so at a wrap the first combatant gets both resets and
          // everyone else keeps a reaction they have not yet earned back.
          if (c.id === sortedCombatants[nextIndex].id) {
            next = { ...next, reaction: false };

            /* And the readied action goes with it. The trigger it was being
               held for never came, and nothing in the rules lets you carry it
               past your own turn — so the chip clears itself rather than
               waiting for a DM to notice it is stale. */
            if (next.conditions.includes(READIED_CONDITION)) {
              next = {
                ...next,
                conditions: next.conditions.filter((x) => x !== READIED_CONDITION),
              };
            }
          }

          return next;
        })
        .sort((a, b) => b.initiative - a.initiative)
    );

    /* The log says why the chip went, since nobody clicked it off. */
    if (readiedExpired) {
      logEvent("condition-off", startingTurn.name, { detail: READIED_CONDITION });
    }

    setCurrentTurnIndex(nextIndex);
    if (isNewRound) setRoundNumber(roundNumber + 1);
  }, [sortedCombatants, safeTurnIndex, roundNumber, setCombatants, setCurrentTurnIndex, setRoundNumber, setLastRun, logEvent]);

  // A dead combatant has no actions to spend — mark them used so the turn can
  // move on. This used to assign straight onto the state object without a
  // setter, so React never saw the change.
  useEffect(() => {
    if (!activeCombatant) return;
    if (
      activeCombatant.conditions.includes("Dead") &&
      !(activeCombatant.action && activeCombatant.bonus && activeCombatant.move)
    ) {
      patchCombatant(activeCombatant.id, { action: true, bonus: true, move: true });
    }
  }, [activeCombatant, patchCombatant]);

  // Advance turn when action, bonus, and move are all checked
  useEffect(() => {
    if (!activeCombatant || hpWindowOpen) return;
    if (activeCombatant.conditions.includes("Dead")) return;

    if (activeCombatant.action && activeCombatant.bonus && activeCombatant.move) {
      handleNextTurn();
    }
  }, [activeCombatant, hpWindowOpen, handleNextTurn]);

  // Unchecking an action hands the turn back to that combatant
  useEffect(() => {
    if (sortedCombatants.length === 0) return;

    const uncheckedIndex = sortedCombatants.findIndex(
      (c) => !c.conditions.includes("Dead") && (!c.action || !c.bonus || !c.move)
    );

    if (uncheckedIndex !== -1 && uncheckedIndex !== currentTurnIndex) {
      if (DEVMODE) console.log("Switching turn because of an uncheck");
      setCurrentTurnIndex(uncheckedIndex);
    }
    // Deliberately keyed on combatants only: this reacts to edits, not to the
    // turn pointer moving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatants]);

  // Keep the clamped index in sync if the list shrank underneath us.
  useEffect(() => {
    if (sortedCombatants.length > 0 && currentTurnIndex !== safeTurnIndex) {
      setCurrentTurnIndex(safeTurnIndex);
    }
  }, [currentTurnIndex, safeTurnIndex, sortedCombatants.length, setCurrentTurnIndex]);

  /**
   * Take someone out of the running battle.
   *
   * The turn has to survive it: the index points into the initiative-sorted
   * list, so removing anyone above the current combatant would otherwise hand
   * the turn to the wrong person. Whoever is up stays up, tracked by id rather
   * than by position, and if it is THEM being removed the turn passes to
   * whoever slides into their slot.
   */
  const removeFromBattle = useCallback(
    (id: string) => {
      const activeId = sortedCombatants[safeTurnIndex]?.id;
      const leaving = combatants.find((c) => c.id === id);
      const remaining = combatants.filter((c) => c.id !== id);
      if (leaving) logEvent("left", leaving.name);
      setCombatants(remaining);

      if (remaining.length === 0) {
        setCurrentTurnIndex(0);
        return;
      }

      const nextSorted = [...remaining].sort((a, b) => b.initiative - a.initiative);
      if (id === activeId) {
        setCurrentTurnIndex(Math.min(safeTurnIndex, nextSorted.length - 1));
        return;
      }
      const stillAt = nextSorted.findIndex((c) => c.id === activeId);
      setCurrentTurnIndex(
        stillAt >= 0 ? stillAt : Math.min(safeTurnIndex, nextSorted.length - 1)
      );
    },
    [combatants, sortedCombatants, safeTurnIndex, setCombatants, setCurrentTurnIndex, logEvent]
  );

  return { handleNextTurn, removeFromBattle };
}
