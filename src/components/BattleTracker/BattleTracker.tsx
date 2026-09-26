import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Combatant } from "../../types/index";
import {
  conditionDescriptionsTwentyTwentyFour,
  conditionDescriptionsTwentyFourteen,
} from "../../constants/Conditions";
import { HpChangeModal } from "../../utils/dmg-heal";
import { getTurnStart, storeTurnStart } from "../../utils/LocalStorage";
import { useHeroes } from "../../hooks/useHeroes";
import { useMonsters } from "../../hooks/useMonsters";
import { useCombat } from "./CombatContext";
import { useGlobalContext } from "../../hooks/optionsContext";
import RoundNumberSpan from "./RoundNumber";
import { CombatantRow } from "./CombatantRow";
import { useCombatantEdits } from "./useCombatantEdits";
import { useBattleManager } from "../../hooks/useStartBattle";
import { track } from "../../utils/telemetry";
import { ConditionReminder } from "./ConditionReminder";
import SBPopup from "./SBPopup";
import { EditBattleDialog } from "./EditBattleDialog";
import { BattleLogDialog } from "./BattleLogDialog";
import { useTurnFlow } from "./useTurnFlow";
import { useTurnTimer } from "./useTurnTimer";
import { useTurnShortcuts } from "./useTurnShortcuts";
import { useHeroEditsReachFight } from "./useHeroEditsReachFight";
import { BattlePrompt } from "./BattlePrompt";
import { useConditionReminder } from "./useConditionReminder";
import { useHpWindow } from "./useHpWindow";

/**
 * What the right-hand side of the page is for, right now.
 *
 *   "prompt"  nothing to fight with yet — say so and show nothing else
 *   "ready"   both rosters have someone: one very large Start the Battle
 *   "running" a battle exists: the tracker, as it has always looked
 *
 * "running" is tested FIRST and on the combatants, not on the rosters,
 * because a monster leaves the Monster Manager when it joins the fray — a
 * DM three rounds into a fight can easily have an empty monster roster, and
 * must not be told to go and add one.
 */
function battleStageOf(combatants: number, heroes: number, monsters: number): "prompt" | "ready" | "running" {
  if (combatants > 0) return "running";
  return heroes > 0 && monsters > 0 ? "ready" : "prompt";
}

/**
 * The battle tracker: the initiative table, and the stages either side of a
 * fight — a prompt while a roster is empty, and one large Start the Battle
 * ribbon once both have someone.
 *
 * The table's rows are CombatantRow. Moving the turn along is useTurnFlow,
 * changing a combatant is useCombatantEdits; this component holds the state
 * they share and the dialogs that open over the table.
 */
const BattleTracker: React.FC = () => {
  const { heroes } = useHeroes();
  const { monsters, setMonsters } = useMonsters();
  const {
    combatants,
    setCombatants,
    currentTurnIndex,
    setCurrentTurnIndex,
    roundNumber,
    setRoundNumber,
    askForInitiative,
    battleLog,
    logEvent,
    clearBattleLog,
  } = useCombat();

  const [isBattleLogOpen, setIsBattleLogOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingConditions, setEditingConditions] = useState<string | null>(null);
  const [isSBPopupOpen, setIsSBPopupOpen] = useState(false);
  /* Seeded from storage so the timer survives a reload: the round number and
     the turn pointer already did, and a timer that alone forgot where it was
     read as the timer being broken. */
  const [isEditBattleOpen, setIsEditBattleOpen] = useState(false);
  const [lastRun, setLastRunState] = useState<number | null>(() => getTurnStart());

  const setLastRun = useCallback((startedAt: number | null) => {
    setLastRunState(startedAt);
    storeTurnStart(startedAt);
  }, []);

  const { settings } = useGlobalContext();
  const timerRef = useTurnTimer(lastRun);

  const sortedCombatants = useMemo(
    () => [...combatants].sort((a, b) => b.initiative - a.initiative),
    [combatants]
  );

  const totalTurns = useMemo(
    () => currentTurnIndex + (roundNumber - 1) * combatants.length,
    [currentTurnIndex, roundNumber, combatants.length]
  );

  // Index is clamped so a stale value (after an import, a battle load, or a
  // delete) can never index past the end of the list.
  const safeTurnIndex =
    sortedCombatants.length === 0
      ? 0
      : Math.min(Math.max(currentTurnIndex, 0), sortedCombatants.length - 1);
  const activeCombatant: Combatant | undefined = sortedCombatants[safeTurnIndex];

  const conditionDescriptions =
    settings.version === "twentyFourteen"
      ? conditionDescriptionsTwentyFourteen
      : conditionDescriptionsTwentyTwentyFour;
  const showConditionReminders = settings.conditionReminderOn !== false;

  const { updateCombatant, patchCombatant, logHpChange, addCondition, removeCondition } =
    useCombatantEdits({ combatants, setCombatants, logEvent });
  const { reminderCombatant, reminderOpen, closeReminder } = useConditionReminder(activeCombatant);
  const { hpModalCombatant, openHpWindow, dismissHpWindow, closeHpWindow } = useHpWindow({
    combatants,
    activeCombatant,
    totalTurns,
    patchCombatant,
  });

  const removeMonstersFromRoster = useCallback(
    (ids: string[]) => {
      const doomed = new Set(ids);
      setMonsters((prev) => prev.filter((m) => !doomed.has(m.id)));
    },
    [setMonsters]
  );

  // Refs of both rosters for the start-battle callback, so its identity
  // doesn't churn on every roster edit. Reads go through the shared context,
  // never localStorage.
  const heroesRef = useRef(heroes);
  const monstersRef = useRef(monsters);
  /* Read by useBattleManager when a new fight replaces this one; a ref rather
     than a dependency so starting a battle does not re-make the callback on
     every round change. */
  const battleRef = useRef({ rounds: roundNumber, combatants: combatants.length });
  battleRef.current = { rounds: roundNumber, combatants: combatants.length };
  useEffect(() => {
    heroesRef.current = heroes;
  }, [heroes]);
  useEffect(() => {
    monstersRef.current = monsters;
  }, [monsters]);

  const { handleStartBattle } = useBattleManager({
    setRoundNumber,
    getHeroes: useCallback(() => heroesRef.current, []),
    getMonsters: useCallback(() => monstersRef.current, []),
    askForInitiative,
    removeMonstersFromRoster,
    setCombatants,
    setCurrentTurnIndex,
    getCurrentBattle: useCallback(() => battleRef.current, []),
  });

  const handleSBContinue = () => {
    setIsSBPopupOpen(false);
    setLastRun(Date.now());
    handleStartBattle();
  };

  /** Everyone out, and the battle back to not having started. */
  const clearBattle = useCallback(() => {
    if (battleRef.current.combatants > 0) {
      track("battle_ended", { ...battleRef.current, ending: "cleared" });
    }
    setCombatants([]);
    setCurrentTurnIndex(0);
    // 0 is the no-battle round: a battle starts at 1 (see useStartBattle).
    setRoundNumber(0);
    setLastRun(null);
    /* The log has to be cleared through state, not just storage:
       clearCombatants() removes the key, but the log's own persistence effect
       would write the still-live React state straight back over it. */
    clearBattleLog();
  }, [setCombatants, setCurrentTurnIndex, setRoundNumber, setLastRun, clearBattleLog]);

  const { handleNextTurn, removeFromBattle } = useTurnFlow({
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
    hpWindowOpen: hpModalCombatant !== null,
    setLastRun,
    patchCombatant,
  });

  useHeroEditsReachFight(heroes, setCombatants);
  useTurnShortcuts(activeCombatant, updateCombatant);

  const battleStage = battleStageOf(combatants.length, heroes.length, monsters.length);

  return (
    <>
      {battleStage === "prompt" && (
        <BattlePrompt heroCount={heroes.length} monsterCount={monsters.length} />
      )}

      {battleStage !== "prompt" && (
        <div id="battleControls" className={battleStage === "ready" ? "isSolo" : undefined}>
          <button
            title="Start a new Battle"
            id="buttonStartBattle"
            aria-label="Start the battle"
            onClick={() => {
              if (combatants.length > 0) {
                setIsSBPopupOpen(true);
              } else {
                setLastRun(Date.now());
                handleStartBattle();
              }
            }}
          />
        </div>
      )}

      {battleStage === "running" && (
        <div id="round">
          {/* Wrapped so portrait can lift .roundActions out of this row and put
              it up beside Start the Battle. RoundNumberSpan returns a fragment
              of two elements, so without a box around them there was no single
              thing to place. In landscape this wrapper is `display: contents`
              and the row is exactly what it was. */}
          <div className="roundLine">
            <RoundNumberSpan roundNumber={roundNumber} timerRef={timerRef} />
          </div>
          {/* The two wrap as a pair. Loose in the row they broke apart at
              1280 — the round, the timer and Edit Battle held the line and the
              log dropped underneath on its own, which read as a stray. */}
          <div className="roundActions">
            <button
              type="button"
              id="buttonEditBattle"
              title="Remove combatants from this battle"
              onClick={() => setIsEditBattleOpen(true)}
            >
              Edit Battle
            </button>
            <button
              type="button"
              id="buttonBattleLog"
              title="What has happened so far in this battle"
              onClick={() => setIsBattleLogOpen(true)}
            >
              Battle Log
            </button>
          </div>
        </div>
      )}

      {/* No empty-state line here any more: with nothing to fight the page is
          at the prompt, and with rosters ready it is the one big ribbon. */}
      {battleStage === "running" && (
        <div id="battleTrackerScroll">
          <table id="battleTracker" role="table">
            <thead id="battleTrackerHeader" role="rowgroup">
              <tr role="row">
                <th role="columnheader" className="thFirst" title="Hero/Monster Name">Name</th>
                <th role="columnheader" className="thMiddle" title="Initiative, either input or rolled">Initiative</th>
                <th role="columnheader" className="thMiddle" title="Current HP / Maximum HP">HP</th>
                <th role="columnheader" className="thMiddle" title="Check if this combatant is using, passing, or holding their action">Action<sup className="colKey" data-key="a">(a)</sup></th>
                <th role="columnheader" className="thMiddle" title="Check if this combatant is using or passing their bonus action">Bonus<sup className="colKey" data-key="s">(s)</sup></th>
                <th role="columnheader" className="thMiddle" title="Check if this combatant is using or passing their movement">Move<sup className="colKey" data-key="d">(d)</sup></th>
                <th role="columnheader" className="thMiddle" title="Check if this combatant has used their reaction, resets on their next turn">Reaction</th>
                <th role="columnheader" className="thLast" title="Input any conditions as they come up, hover over their name for a reminder of the effects.">Conditions</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {sortedCombatants.map((combatant, index) => (
                <CombatantRow
                  key={combatant.id}
                  combatant={combatant}
                  hero={combatant.type === "hero" ? heroes.find((h) => h.id === combatant.id) : undefined}
                  isCurrent={index === safeTurnIndex}
                  roundNumber={roundNumber}
                  conditionDescriptions={conditionDescriptions}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditingConditions={editingConditions === combatant.id}
                  setEditingConditions={setEditingConditions}
                  updateCombatant={updateCombatant}
                  addCondition={addCondition}
                  removeCondition={removeCondition}
                  onOpenHp={openHpWindow}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reminderCombatant && showConditionReminders && (
        <ConditionReminder combatant={reminderCombatant} isOpen={reminderOpen} onClose={closeReminder} />
      )}

      {hpModalCombatant && (
        <HpChangeModal
          combatant={hpModalCombatant}
          combatantName={hpModalCombatant.name}
          currentHp={hpModalCombatant.currHp}
          maxHp={hpModalCombatant.maxHp}
          tHp={hpModalCombatant.tHp}
          conditions={hpModalCombatant.conditions}
          type={hpModalCombatant.type}
          deathsaves={hpModalCombatant.deathsaves || []}
          updateCombatant={updateCombatant}
          onSubmit={(newHp, newtHp) => {
            logHpChange(hpModalCombatant, newHp, newtHp);
            patchCombatant(hpModalCombatant.id, { currHp: newHp, tHp: newtHp });
          }}
          onUpdateBoth={(newHp, newtHp, newConditions) => {
            logHpChange(hpModalCombatant, newHp, newtHp);
            patchCombatant(hpModalCombatant.id, { currHp: newHp, tHp: newtHp, conditions: newConditions });
            dismissHpWindow();
          }}
          onUpdateDeathSaves={(saves) => {
            patchCombatant(hpModalCombatant.id, { deathsaves: saves });
          }}
          onClose={() => closeHpWindow(handleNextTurn)}
        />
      )}

      {isEditBattleOpen && (
        <EditBattleDialog
          combatants={sortedCombatants}
          activeId={activeCombatant?.id}
          onRemove={removeFromBattle}
          onClear={clearBattle}
          updateCombatant={updateCombatant}
          onClose={() => setIsEditBattleOpen(false)}
        />
      )}

      {isBattleLogOpen && (
        <BattleLogDialog log={battleLog} onClose={() => setIsBattleLogOpen(false)} />
      )}

      <SBPopup
        isOpen={isSBPopupOpen}
        onCancel={() => setIsSBPopupOpen(false)}
        onContinue={handleSBContinue}
      />
    </>
  );
};

export default BattleTracker;
