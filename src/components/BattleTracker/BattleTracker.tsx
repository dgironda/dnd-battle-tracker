import { DEVMODE } from "../../utils/devmode";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Monster, Combatant } from "../../types/index";
import {
  conditionOptions,
  conditionDescriptionsTwentyTwentyFour,
  conditionDescriptionsTwentyFourteen,
} from "../../constants/Conditions";
import { EditableCell } from "../../utils/Utils";
import { useConditionTip } from "./useConditionTip";
import {
  checkboxStyle,
  checkboxVariant,
  turnCircleVariant,
  underlineStyle,
  underlineVariant,
} from "../../utils/handArt";
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
  const { showTip, hideTip, tipNode, tipId, tipName } = useConditionTip(combatant.id);

  /* An empty cell IS the editor. "Click to add conditions" was a button whose
     only job was to reveal the control right behind it — one click of pure
     ceremony on the thing a DM reaches for most. With nothing to show, the
     editor is barely taller than the prompt was, so the picker just sits
     there ready.
     Once there is something to show, the cell goes back to being a display
     that opens the editor on click; `Done` is what makes that switch, which is
     why adding a condition also starts an explicit edit. */
  const isEmpty = combatant.conditions.length === 0;
  const showEditor = isEditing || isEmpty;

  /* A chip that is clicked away unmounts without ever firing mouseleave, so
     its tooltip would sit there pointing at nothing. Done does the same by
     swapping every editing chip for a display one — the condition is still in
     the list, so checking the list alone does not catch it.
     Clearing on both the list and the mode covers every route a chip can
     vanish by. */
  useEffect(() => {
    hideTip();
  }, [combatant.conditions, isEditing, hideTip]);

  if (showEditor) {
    return (
      <div className="conditionEditOuter">
        <div>
          {combatant.conditions.map((conditionName) => (
            <button
              type="button"
              key={conditionName}
              className="conditionNameEditing"
              onClick={() => {
                // straight away, so it cannot flash on the way out
                hideTip();
                onRemove(combatant.id, conditionName);
              }}
              onMouseEnter={(e) => showTip(e, conditionName, conditionDescriptions[conditionName])}
              onMouseLeave={hideTip}
              onFocus={(e) => showTip(e, conditionName, conditionDescriptions[conditionName])}
              onBlur={hideTip}
              aria-label={`Remove ${conditionName}`}
              aria-describedby={tipName === conditionName ? tipId : undefined}
            >
              {conditionName}
              <span className="conditionRemove" aria-hidden="true">×</span>
            </button>
          ))}
        </div>

        <select
          onChange={(e) => {
            if (e.target.value) {
              onAdd(combatant.id, e.target.value);
              /* Hold the editor open so more can be added; Done closes it.
                 Without this the cell would flip to the display view the
                 instant the first condition landed. */
              onStartEditing(combatant.id);
              e.target.value = "";
            }
          }}
          className="conditionSelect"
          name="conditionSelect"
          aria-label={`Add a condition to ${combatant.name}`}
        >
          <option className="addConditionBox" value="">+ Add</option>
          {conditionOptions
            .filter((condition) => !combatant.conditions.includes(condition))
            .map((condition) => (
              <option key={condition} value={condition}>{condition}</option>
            ))}
        </select>

        {/* Only once there is something to finish: an empty cell's picker is
            already its resting state, so Done would have nothing to close. */}
        {isEditing && !isEmpty && (
          <button onClick={onStopEditing} className="editConditionsDone">
            Done
          </button>
        )}
        {tipNode}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onStartEditing(combatant.id)}
        className="editConditions"
        aria-label="Click to edit conditions"
      >
        {combatant.conditions.map((conditionName) => (
          <span
            key={conditionName}
            className="conditionName"
            onMouseEnter={(e) => showTip(e, conditionName, conditionDescriptions[conditionName])}
            onMouseLeave={hideTip}
            aria-describedby={tipName === conditionName ? tipId : undefined}
          >
            {conditionName}
          </span>
        ))}
      </button>
      {tipNode}
    </>
  );
};

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
    // At full health the plaque shows through untouched. Painting parchment
    // over parchment would otherwise leave a faint rectangle wherever the two
    // tones did not match exactly.
    if (maxHp === 0 || currHp >= maxHp) return "transparent";

    const percentage = Math.max(0, Math.min(1, currHp / maxHp));

    // Start colour: the parchment, in both themes. It used to follow the theme
    // (#484c51 in dark), which made sense when the row was a themed table cell
    // — but the row is drawn artwork now and the artwork does not follow the
    // theme, so dark mode ramped from a dark grey sitting on a light plaque.
    const [startR, startG, startB] = [0xf8, 0xf2, 0xeb];
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

          // Action, bonus and move are cleared once a round, when the order
          // wraps — never on entering a turn. Clearing them on entry meant
          // that stepping back to an earlier combatant (done by unticking one
          // of their boxes, which hands the turn back) and then coming forward
          // again wiped whatever the later combatant had already marked. The
          // marks are the DM's record of what has happened this round, so they
          // survive moving around in it.
          if (isNewRound) {
            return { ...c, action: false, bonus: false, move: false, reaction: false };
          }

          // A reaction refreshes at the start of its owner's turn, which is
          // the rule as written, and is not part of the walk-the-order record
          // above — nothing hands the turn back on the strength of it.
          if (c.id === sortedCombatants[nextIndex].id) {
            return { ...c, reaction: false };
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
                    role="row"
                    className={`combatantInfo${isCurrent ? ` isCurrentTurn ${turnCircleVariant(combatant.id)}` : ""}`}
                  >
                    <td role="cell" className={`combatantName ${underlineVariant(combatant.id)}`} style={underlineStyle(combatant.id)}>
                      {isCurrent && <span className="currentTurnIndicator" aria-hidden="true" />}

                      {combatant.type === "hero" ? (
                        // hero may be undefined if they were deleted mid-battle;
                        // HeroStatBlockHover handles that and falls back to the
                        // combatant's own data.
                        <HeroStatBlockHover hero={hero} combatant={combatant}>
                          <span className={`combatantNameText${isDead ? " strike" : ""}`}>{combatant.name}</span>
                        </HeroStatBlockHover>
                      ) : combatant.type === "monster" ? (
                        <MonsterStatBlockHover
                          monster={combatantToMonster(combatant)}
                          currentHp={combatant.currHp}
                          updateCombatant={updateCombatant}
                        >
                          <span className={`combatantNameText${isDead ? " strike" : ""}`}>{combatant.name}</span>
                        </MonsterStatBlockHover>
                      ) : (
                        <span className="combatantNameText">{combatant.name}</span>
                      )}
                    </td>

                    <td role="cell" className="combatantInit">
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
                      role="cell"
                      className="combatantHP"
                      style={{
                        /* A custom property, not backgroundColor: the tint is
                           painted by the button inside the cell, not by the
                           cell — see .combatantHP in fixes.css for why. */
                        ["--hp-tint" as string]: getHpColor(combatant.currHp, combatant.maxHp),
                        // Healthy HP inherits the table's own ink, so it
                        // matches initiative exactly. Only a bloodied cell
                        // overrides it, because by then the cell's ground has
                        // gone dark red and that ink no longer reads on it.
                        color:
                          combatant.currHp < combatant.maxHp * 0.5
                            ? "var(--color-hpbloodied)"
                            : undefined,
                      }}
                    >
                      {/* A button, like the initiative cell: it picks up the
                          same face, padding and hover, and unlike the click
                          handler that used to sit on the <td> it can be
                          reached from the keyboard. */}
                      <button
                        type="button"
                        className="setEditingField hpButton"
                        onClick={() => setHpModalCombatant(combatant)}
                        title="Click to change HP"
                      >
                        {combatant.tHp > 0 && <span className="thp">🛡️({combatant.tHp})</span>}
                        <span className="hpValue">
                          {combatant.currHp} / {combatant.maxHp}
                        </span>
                        <img src={HeartIcon} alt="" aria-hidden="true" className="hpHeart" />
                      </button>
                    </td>

                    {/* The drawn box and the drawn tick are separate elements: the
                        tick is wiped in as if being drawn, and a mask on the input
                        itself would have taken the box with it. The cell carries the
                        variant and the per-instance tilt so both inherit them. */}
                    {actionCells.map(({ key, cls, label }) => (
                      <td
                        role="cell"
                        className={`${cls} ${checkboxVariant(combatant.id, key)}`}
                        style={checkboxStyle(combatant.id, key)}
                        key={key}
                      >
                        <input
                          type="checkbox"
                          id={`${combatant.id}-${key}`}
                          checked={combatant[key]}
                          disabled={isDead || isDying}
                          onChange={(e) => updateCombatant(combatant.id, key, e.target.checked)}
                        />
                        <span className="tickMark" aria-hidden="true" />
                        <label htmlFor={`${combatant.id}-${key}`} className="checkOverlay">
                          {label}
                        </label>
                      </td>
                    ))}

                    <td role="cell" className="combatantConditions">
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
