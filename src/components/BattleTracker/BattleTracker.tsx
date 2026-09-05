import { DEVMODE } from "../../utils/devmode";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Monster, Combatant } from "../../types/index";
import {
  predefinedConditions,
  conditionDescriptionsTwentyTwentyFour,
  conditionDescriptionsTwentyFourteen,
} from "../../constants/Conditions";
import { EditableCell } from "../../utils/Utils";
import { HpChangeModal } from "../../utils/dmg-heal";
import { useHeroes } from "../../hooks/useHeroes";
import { useMonsters } from "../../hooks/useMonsters";
import { useCombat } from "./CombatContext";
import { useGlobalContext } from "../../hooks/optionsContext";
import RoundNumberSpan from "./RoundNumber";
import { HeroStatBlockHover } from "./HeroStatBlockHover";
import { MonsterStatBlockHover } from "./MonsterStatBlockHover";
import { useBattleManager } from "../../hooks/useStartBattle";
import { ConditionReminder } from "./ConditionReminder";
import SBPopup from "./SBPopup";
import HeartIcon from "../../assets/draftsvgs_v2/icon_hp.svg";

const numericFields: (keyof Combatant)[] = [
  "hp", "currHp", "maxHp", "ac", "str", "dex", "con", "int", "wis", "cha", "pp", "init", "tHp",
];

type UpdateCombatant = (
  combatantId: string,
  field: keyof Combatant,
  value: string | number | boolean | string[]
) => void;

/**
 * Build the Monster shape the hover card expects from a combatant row.
 * This used to be a 40-line IIFE inlined in the JSX, re-running for every
 * monster on every render.
 */
function combatantToMonster(c: Combatant): Monster {
  return {
    id: c.id,
    name: c.name,
    link: c.link ?? "",
    hp: c.currHp,
    maxHp: c.maxHp,
    currHp: c.currHp,
    ac: c.ac,
    str: c.str,
    dex: c.dex,
    con: c.con,
    int: c.int,
    wis: c.wis,
    cha: c.cha,
    pp: c.pp,
    init: c.init,
    hidden: false,
    present: true,
    conditions: c.conditions ?? [],
  };
}

interface ConditionsEditorProps {
  combatant: Combatant;
  isEditing: boolean;
  conditionDescriptions: Record<string, string>;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onAdd: (id: string, condition: string) => void;
  onRemove: (id: string, condition: string) => void;
}

/**
 * Declared at module scope. It used to live inside BattleTracker's body, so
 * React saw a brand-new component type on every render and remounted the whole
 * subtree — losing focus and the open <select> mid-edit.
 */
const ConditionsEditor: React.FC<ConditionsEditorProps> = ({
  combatant,
  isEditing,
  conditionDescriptions,
  onStartEditing,
  onStopEditing,
  onAdd,
  onRemove,
}) => {
  if (isEditing) {
    return (
      <div className="conditionEditOuter">
        <div>
          {combatant.conditions.map((conditionName) => (
            <button
              type="button"
              key={conditionName}
              className="conditionNameEditing"
              onClick={() => onRemove(combatant.id, conditionName)}
              title={conditionDescriptions[conditionName] || conditionName}
            >
              {conditionName} ×
            </button>
          ))}
        </div>

        <select
          onChange={(e) => {
            if (e.target.value) {
              onAdd(combatant.id, e.target.value);
              e.target.value = "";
            }
          }}
          className="conditionSelect"
          name="conditionSelect"
          aria-label={`Add a condition to ${combatant.name}`}
        >
          <option className="addConditionBox" value="">Add condition...</option>
          {predefinedConditions
            .filter((condition) => !combatant.conditions.includes(condition))
            .map((condition) => (
              <option key={condition} value={condition}>{condition}</option>
            ))}
        </select>

        <button onClick={onStopEditing} className="editConditionsDone">
          Done
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onStartEditing(combatant.id)}
      className="editConditions"
      title="Click to edit conditions"
    >
      {combatant.conditions.length > 0 ? (
        combatant.conditions.map((conditionName) => (
          <span
            key={conditionName}
            className="conditionName"
            title={conditionDescriptions[conditionName] || conditionName}
          >
            {conditionName}
          </span>
        ))
      ) : (
        <span className="noCondition">Click to add conditions</span>
      )}
    </button>
  );
};

/**
 * Picks which cut of the plaque artwork a cell gets.
 *
 * Every plaque carries a hand-drawn notch in its edge, and a 9-sliced image
 * puts that notch at the same fraction of every cell it is drawn into — so a
 * column of cells lines the notches up in a visible vertical stripe. Choosing
 * between mirrored cuts of the artwork per cell breaks that up.
 *
 * The choice is a hash of the combatant's id and the column, so it is stable:
 * a given combatant's row keeps the same plaques across re-renders, sorting
 * and reloads, instead of reshuffling underneath the reader.
 */
function plaqueVariant(id: string, column: number, count: number): number {
  let h = 0x811c9dc5;
  const key = `${id}:${column}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h) % count;
}

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
  } = useCombat();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingConditions, setEditingConditions] = useState<string | null>(null);
  const [hpModalCombatant, setHpModalCombatant] = useState<Combatant | null>(null);
  const [conditionModalCombatant, setConditionModalCombatant] = useState<Combatant | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [isSBPopupOpen, setIsSBPopupOpen] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);

  const { settings } = useGlobalContext();
  const timerRef = useRef<HTMLSpanElement>(null);
  const processedTurnRef = useRef(-1);

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
  const currentTheme = settings.theme;

  const updateCombatant = useCallback<UpdateCombatant>((combatantId, field, value) => {
    setCombatants((prev) =>
      prev
        .map((c) =>
          c.id === combatantId
            ? {
                ...c,
                [field]:
                  field === "conditions" && Array.isArray(value)
                    ? value
                    : numericFields.includes(field)
                      ? Number(value)
                      : value,
              }
            : c
        )
        .sort((a, b) => b.initiative - a.initiative)
    );
  }, [setCombatants]);

  const addCondition = useCallback((combatantId: string, condition: string) => {
    setCombatants((prev) =>
      prev.map((c) =>
        c.id === combatantId && !c.conditions.includes(condition)
          ? { ...c, conditions: [...c.conditions, condition] }
          : c
      )
    );
  }, [setCombatants]);

  const removeCondition = useCallback((combatantId: string, conditionToRemove: string) => {
    setCombatants((prev) =>
      prev.map((c) =>
        c.id === combatantId
          ? { ...c, conditions: c.conditions.filter((x) => x !== conditionToRemove) }
          : c
      )
    );
  }, [setCombatants]);

  const getHpColor = (currHp: number, maxHp: number): string => {
    if (maxHp === 0) return "#f8f2eb";

    const percentage = Math.max(0, Math.min(1, currHp / maxHp));

    // Start color: light-dark(#f8f2eb, #484c51) (100% HP)
    const [startR, startG, startB] =
      currentTheme === "light" ? [0xf8, 0xf2, 0xeb] : [0x48, 0x4c, 0x51];
    // End color: #880808 (0% HP)
    const [endR, endG, endB] = [0x88, 0x08, 0x08];

    const mix = (start: number, end: number) =>
      Math.round(end + (start - end) * percentage)
        .toString(16)
        .padStart(2, "0");

    return `#${mix(startR, endR)}${mix(startG, endG)}${mix(startB, endB)}`;
  };

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
  });

  const handleSBContinue = () => {
    setIsSBPopupOpen(false);
    setLastRun(Date.now());
    handleStartBattle();
  };

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

    setCombatants((prev) =>
      prev
        .map((c) => {
          if (c.conditions.includes("Dead")) return c;
          const isNextCombatant = c.id === sortedCombatants[nextIndex].id;
          if (isNewRound || isNextCombatant) {
            return { ...c, action: false, bonus: false, move: false, reaction: false };
          }
          return c;
        })
        .sort((a, b) => b.initiative - a.initiative)
    );

    setCurrentTurnIndex(nextIndex);
    if (isNewRound) setRoundNumber(roundNumber + 1);
  }, [sortedCombatants, safeTurnIndex, roundNumber, setCombatants, setCurrentTurnIndex, setRoundNumber]);

  // Always-current handle on the active combatant, so effects can read it
  // without taking a dependency on every mutation of the object.
  const activeCombatantRef = useRef(activeCombatant);
  activeCombatantRef.current = activeCombatant;

  // Condition reminder for whoever's turn it is. Keyed on the turn moving and
  // on conditions being added or removed — depending on the whole combatant
  // would reopen the reminder on every HP change during that turn.
  const activeCombatantId = activeCombatant?.id;
  const activeConditionCount = activeCombatant?.conditions.length ?? 0;
  useEffect(() => {
    const current = activeCombatantRef.current;
    if (!current || activeConditionCount === 0) {
      setShowConditionModal(false);
      return;
    }
    setConditionModalCombatant(current);
    setShowConditionModal(true);
  }, [activeCombatantId, activeConditionCount]);

  // Auto-open HP modal for death saves
  useEffect(() => {
    if (!activeCombatant || hpModalCombatant !== null) return;
    if (processedTurnRef.current === totalTurns) return;

    if (activeCombatant.conditions.includes("Death Saves")) {
      setHpModalCombatant(activeCombatant);
      processedTurnRef.current = totalTurns;
      if (DEVMODE) console.log(activeCombatant.name, "needs to make a death saving throw.");
    }
  }, [activeCombatant, hpModalCombatant, totalTurns]);

  // A dead combatant has no actions to spend — mark them used so the turn can
  // move on. This used to assign straight onto the state object without a
  // setter, so React never saw the change.
  useEffect(() => {
    if (!activeCombatant) return;
    if (
      activeCombatant.conditions.includes("Dead") &&
      !(activeCombatant.action && activeCombatant.bonus && activeCombatant.move)
    ) {
      setCombatants((prev) =>
        prev.map((c) =>
          c.id === activeCombatant.id
            ? { ...c, action: true, bonus: true, move: true }
            : c
        )
      );
    }
  }, [activeCombatant, setCombatants]);

  // Advance turn when action, bonus, and move are all checked
  useEffect(() => {
    if (!activeCombatant || hpModalCombatant !== null) return;
    if (activeCombatant.conditions.includes("Dead")) return;

    if (activeCombatant.action && activeCombatant.bonus && activeCombatant.move) {
      handleNextTurn();
    }
  }, [activeCombatant, hpModalCombatant, handleNextTurn]);

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

  // Current Turn Time
  useEffect(() => {
    if (!lastRun) {
      if (timerRef.current) {
        timerRef.current.innerText = "Advance the turn to start the timer";
      }
      return;
    }

    const render = () => {
      const totalSeconds = Math.floor((Date.now() - lastRun) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let timeString = `${seconds}s`;
      if (minutes > 0) timeString = `${minutes}m ${timeString}`;
      if (hours > 0) timeString = `${hours}h ${timeString}`;

      if (timerRef.current) {
        timerRef.current.innerText = "Current Turn Time: " + timeString;
      }
    };

    render();
    const interval = setInterval(render, 1000);
    return () => clearInterval(interval);
  }, [lastRun]);

  // Action, Bonus, Movement keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      if (!activeCombatant) return;
      if (
        activeCombatant.conditions.includes("Dead") ||
        activeCombatant.conditions.includes("Death Saves")
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "a":
          updateCombatant(activeCombatant.id, "action", !activeCombatant.action);
          break;
        case "s":
          updateCombatant(activeCombatant.id, "bonus", !activeCombatant.bonus);
          break;
        case "d":
          updateCombatant(activeCombatant.id, "move", !activeCombatant.move);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [activeCombatant, updateCombatant]);

  const actionCells: { key: "action" | "bonus" | "move" | "reaction"; cls: string; label: string }[] = [
    { key: "action", cls: "combatantAction", label: "A" },
    { key: "bonus", cls: "combatantBonus", label: "B" },
    { key: "move", cls: "combatantMove", label: "M" },
    { key: "reaction", cls: "combatantReaction", label: "R" },
  ];

  return (
    <>
      <div id="battleControls">
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

      {combatants.length > 0 && (
        <div id="round">
          <RoundNumberSpan roundNumber={roundNumber} timerRef={timerRef} />
        </div>
      )}

      {sortedCombatants.length === 0 ? (
        <p id="noCombatants">No combatants in battle. Start a battle to see combatants here.</p>
      ) : (
        <div id="battleTrackerScroll">
          <table id="battleTracker">
            <thead id="battleTrackerHeader">
              <tr>
                <th className="thFirst" title="Hero/Monster Name">Name</th>
                <th className="thMiddle" title="Initiative, either input or rolled">Initiative</th>
                <th className="thMiddle" title="Current HP / Maximum HP">HP</th>
                <th className="thMiddle" title="Check if this combatant is using, passing, or holding their action">Action<sup>(a)</sup></th>
                <th className="thMiddle" title="Check if this combatant is using or passing their bonus action">Bonus<sup>(s)</sup></th>
                <th className="thMiddle" title="Check if this combatant is using or passing their movement">Move<sup>(d)</sup></th>
                <th className="thMiddle" title="Check if this combatant has used their reaction, resets on their next turn">Reaction</th>
                <th className="thLast" title="Input any conditions as they come up, hover over their name for a reminder of the effects.">Conditions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCombatants.map((combatant, index) => {
                const isCurrent = index === safeTurnIndex;
                const isDead = combatant.conditions.includes("Dead");
                const isDying = combatant.conditions.includes("Death Saves");
                const hero = combatant.type === "hero"
                  ? heroes.find((h) => h.id === combatant.id)
                  : undefined;

                return (
                  <tr
                    key={combatant.id}
                    className={`combatantInfo${isCurrent ? " isCurrentTurn" : ""}`}
                  >
                    <td className={`combatantName namePlaque${plaqueVariant(combatant.id, 0, 4)}`}>
                      {isCurrent && <span className="currentTurnIndicator" aria-hidden="true">▶</span>}

                      {combatant.type === "hero" ? (
                        // hero may be undefined if they were deleted mid-battle;
                        // HeroStatBlockHover handles that and falls back to the
                        // combatant's own data.
                        <HeroStatBlockHover hero={hero} combatant={combatant}>
                          <span className={isDead ? "strike" : undefined}>{combatant.name}</span>
                        </HeroStatBlockHover>
                      ) : combatant.type === "monster" ? (
                        <MonsterStatBlockHover
                          monster={combatantToMonster(combatant)}
                          currentHp={combatant.currHp}
                          updateCombatant={updateCombatant}
                        >
                          <span className={isDead ? "strike" : undefined}>{combatant.name}</span>
                        </MonsterStatBlockHover>
                      ) : (
                        <span>{combatant.name}</span>
                      )}
                    </td>

                    <td className={`combatantInit midPlaque${plaqueVariant(combatant.id, 1, 6)}`}>
                      <span title="Initiative">
                        <EditableCell
                          entity={combatant}
                          field="initiative"
                          type="number"
                          editingField={editingField}
                          setEditingField={setEditingField}
                          updateEntity={updateCombatant}
                        />
                      </span>
                    </td>

                    <td
                      className={`combatantHP midPlaque${plaqueVariant(combatant.id, 2, 6)}`}
                      style={{
                        backgroundColor: getHpColor(combatant.currHp, combatant.maxHp),
                        color:
                          combatant.currHp < combatant.maxHp * 0.5
                            ? "var(--color-hpbloodied)"
                            : "var(--color-hphealthy)",
                      }}
                      onClick={() => setHpModalCombatant(combatant)}
                      title="Click to change HP"
                    >
                      {combatant.tHp > 0 && <span className="thp">🛡️({combatant.tHp})</span>}
                      <span className="hpValue">
                        {combatant.currHp} / {combatant.maxHp}
                      </span>
                      <img src={HeartIcon} alt="" aria-hidden="true" className="hpHeart" />
                    </td>

                    {actionCells.map(({ key, cls, label }, i) => (
                      <td className={`${cls} midPlaque${plaqueVariant(combatant.id, 3 + i, 6)}`} key={key}>
                        <input
                          type="checkbox"
                          id={`${combatant.id}-${key}`}
                          checked={combatant[key]}
                          disabled={isDead || isDying}
                          onChange={(e) => updateCombatant(combatant.id, key, e.target.checked)}
                        />
                        <label htmlFor={`${combatant.id}-${key}`} className="checkOverlay">
                          {label}
                        </label>
                      </td>
                    ))}

                    <td className={`combatantConditions condPlaque${plaqueVariant(combatant.id, 7, 4)}`}>
                      <ConditionsEditor
                        combatant={combatant}
                        isEditing={editingConditions === combatant.id}
                        conditionDescriptions={conditionDescriptions}
                        onStartEditing={setEditingConditions}
                        onStopEditing={() => setEditingConditions(null)}
                        onAdd={addCondition}
                        onRemove={removeCondition}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {conditionModalCombatant && showConditionReminders && (
        <ConditionReminder
          combatant={conditionModalCombatant}
          isOpen={showConditionModal}
          onClose={() => setShowConditionModal(false)}
        />
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
            setCombatants((prev) =>
              prev
                .map((c) => (c.id === hpModalCombatant.id ? { ...c, currHp: newHp, tHp: newtHp } : c))
                .sort((a, b) => b.initiative - a.initiative)
            );
          }}
          onUpdateBoth={(newHp, newtHp, newConditions) => {
            setCombatants((prev) =>
              prev
                .map((c) =>
                  c.id === hpModalCombatant.id
                    ? { ...c, currHp: newHp, tHp: newtHp, conditions: newConditions }
                    : c
                )
                .sort((a, b) => b.initiative - a.initiative)
            );
            setHpModalCombatant(null);
          }}
          onUpdateDeathSaves={(saves) => {
            setCombatants((prev) =>
              prev
                .map((c) => (c.id === hpModalCombatant.id ? { ...c, deathsaves: saves } : c))
                .sort((a, b) => b.initiative - a.initiative)
            );
            setHpModalCombatant((prev) => (prev ? { ...prev, deathsaves: saves } : prev));
          }}
          onClose={() => {
            // If this modal was opened automatically for a death save, spend the
            // turn on the way out. Done through the setter, not by assigning
            // onto the sorted array.
            if (processedTurnRef.current === totalTurns && activeCombatant) {
              const id = activeCombatant.id;
              setCombatants((prev) =>
                prev.map((c) =>
                  c.id === id ? { ...c, action: true, bonus: true, move: true } : c
                )
              );
              handleNextTurn();
            }
            setHpModalCombatant(null);
          }}
        />
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
