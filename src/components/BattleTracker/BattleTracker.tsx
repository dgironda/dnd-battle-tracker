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
import { CROSS_OUT_SLAIN_MONSTERS } from "../../utils/experiments";
import { getTurnStart, storeTurnStart } from "../../utils/LocalStorage";
import { useHeroes } from "../../hooks/useHeroes";
import { useMonsters } from "../../hooks/useMonsters";
import { useCombat } from "./CombatContext";
import { useGlobalContext } from "../../hooks/optionsContext";
import RoundNumberSpan from "./RoundNumber";
import { HeroStatBlockHover } from "./HeroStatBlockHover";
import { MonsterStatBlockHover } from "./MonsterStatBlockHover";
import { useBattleManager } from "../../hooks/useStartBattle";
import { track } from "../../utils/telemetry";
import { ConditionReminder } from "./ConditionReminder";
import SBPopup from "./SBPopup";
import { EditBattleDialog } from "./EditBattleDialog";
import { BattleLogDialog } from "./BattleLogDialog";
import HeartIcon from "../../assets/draftsvgs_v2/icon_hp.svg";
import TempHpIcon from "../../assets/draftsvgs_v2/icon_temphp.svg";

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
          <option className="addConditionBox" value="">+ Add Condition</option>
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
    battleLog,
    logEvent,
    clearBattleLog,
  } = useCombat();

  const [isBattleLogOpen, setIsBattleLogOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingConditions, setEditingConditions] = useState<string | null>(null);
  /* Which combatant the HP window is open on — the ID, not a copy of them.
     It used to hold a snapshot taken when the window opened, so editing
     temporary hit points inside it wrote to the real combatant while the
     window went on showing the stale figure: it looked stuck on 0 until you
     closed it. Everything the window shows is read live now, which also keeps
     the death-save tally and the conditions current while it is open. */
  const [hpModalId, setHpModalId] = useState<string | null>(null);
  const [conditionModalCombatant, setConditionModalCombatant] = useState<Combatant | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
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
  const timerRef = useRef<HTMLSpanElement>(null);
  const processedTurnRef = useRef(-1);

  const hpModalCombatant = useMemo(
    () => (hpModalId === null ? null : combatants.find((c) => c.id === hpModalId) ?? null),
    [combatants, hpModalId]
  );

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

  /**
   * Turn one hit-point edit into however many things actually happened.
   *
   * The HP window applies damage, healing and temporary hit points through the
   * same two callbacks, so what changed has to be worked out by comparing —
   * and one press can genuinely be two events, since damage that takes someone
   * to zero both hurt them and put them down.
   */
  const logHpChange = useCallback(
    (before: Combatant, newHp: number, newtHp: number) => {
      if (newHp < before.currHp) {
        logEvent("damage", before.name, {
          amount: before.currHp - newHp,
          from: before.currHp,
          to: newHp,
        });
      } else if (newHp > before.currHp) {
        logEvent("heal", before.name, {
          amount: newHp - before.currHp,
          from: before.currHp,
          to: newHp,
        });
      }

      if (newtHp !== before.tHp) {
        logEvent("temp-hp", before.name, { amount: newtHp });
      }

      /* Crossing zero is the thing a DM scans the log for, so it gets a line
         of its own rather than being left implicit in "took 12". */
      if (before.currHp > 0 && newHp <= 0) logEvent("down", before.name);
      else if (before.currHp <= 0 && newHp > 0) logEvent("revived", before.name);
    },
    [logEvent]
  );

  const addCondition = useCallback((combatantId: string, condition: string) => {
    /* Reported from out here rather than from inside the updater: StrictMode
       runs updaters twice and every condition would be counted twice. The
       "already has it" test is the same one the updater makes, read off this
       render's combatants. */
    const target = combatants.find((c) => c.id === combatantId);
    if (target && !target.conditions.includes(condition)) {
      track("condition_applied", { condition });
    }

    setCombatants((prev) =>
      prev.map((c) => {
        if (c.id !== combatantId || c.conditions.includes(condition)) return c;
        /* Logged from inside the updater so it only fires when the condition
           actually goes on — clicking a condition already present is not an
           event and should not read as one. */
        logEvent("condition-on", c.name, { detail: condition });
        return { ...c, conditions: [...c.conditions, condition] };
      })
    );
  }, [combatants, setCombatants, logEvent]);

  const removeCondition = useCallback((combatantId: string, conditionToRemove: string) => {
    setCombatants((prev) =>
      prev.map((c) => {
        if (c.id !== combatantId || !c.conditions.includes(conditionToRemove)) return c;
        logEvent("condition-off", c.name, { detail: conditionToRemove });
        return { ...c, conditions: c.conditions.filter((x) => x !== conditionToRemove) };
      })
    );
  }, [setCombatants, logEvent]);

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
          }

          return next;
        })
        .sort((a, b) => b.initiative - a.initiative)
    );

    setCurrentTurnIndex(nextIndex);
    if (isNewRound) setRoundNumber(roundNumber + 1);
  }, [sortedCombatants, safeTurnIndex, roundNumber, setCombatants, setCurrentTurnIndex, setRoundNumber, setLastRun]);

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
      setHpModalId(activeCombatant.id);
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

  /**
   * Edits in the Hero Manager reach the hero who is already fighting.
   *
   * A combatant is a copy taken when the battle started, so fixing a typo in a
   * name or correcting an AC mid-session used to change the roster and leave
   * the tracker showing the old value until the next battle.
   *
   * Only what the Hero Manager owns is copied. The fight owns the rest, and
   * overwriting it here would undo the session: current hit points, temporary
   * hit points, conditions, death saves, the spent action/bonus/move/reaction
   * flags, and the rolled initiative all stay exactly as they are.
   *
   * Raising a hero's maximum does NOT heal them — a level-up gives you a
   * bigger pool, not a full one. Lowering it below where they currently are
   * does pull them down to the new maximum, because 40/20 is not a state the
   * rest of the app can draw.
   */
  useEffect(() => {
    if (heroes.length === 0) return;

    setCombatants((prev) => {
      let changed = false;

      const next = prev.map((c) => {
        if (c.type !== "hero") return c;
        const hero = heroes.find((h) => h.id === c.id);
        if (!hero) return c;

        const maxHp = hero.hp ?? c.maxHp;
        const patch: Partial<typeof c> = {};

        if (hero.name !== c.name) patch.name = hero.name;
        if (maxHp !== c.maxHp) patch.maxHp = maxHp;
        // Only ever downwards, and only when they are over the new ceiling.
        if (c.currHp > maxHp) patch.currHp = maxHp;

        const stats = ["ac", "str", "dex", "con", "int", "wis", "cha", "pp", "init"] as const;
        for (const key of stats) {
          const value = hero[key];
          if (typeof value === "number" && value !== c[key]) patch[key] = value;
        }
        const link = hero.link ?? "";
        if (link !== (c.link ?? "")) patch.link = link;

        if (Object.keys(patch).length === 0) return c;
        changed = true;
        return { ...c, ...patch };
      });

      // Returning the same array when nothing moved keeps this from looping
      // through the persistence effect and back.
      return changed ? next : prev;
    });
  }, [heroes, setCombatants]);

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
  const battleStage: "prompt" | "ready" | "running" =
    combatants.length > 0
      ? "running"
      : heroes.length > 0 && monsters.length > 0
        ? "ready"
        : "prompt";

  const actionCells: { key: "action" | "bonus" | "move" | "reaction"; cls: string; label: string }[] = [
    { key: "action", cls: "combatantAction", label: "A" },
    { key: "bonus", cls: "combatantBonus", label: "B" },
    { key: "move", cls: "combatantMove", label: "M" },
    { key: "reaction", cls: "combatantReaction", label: "R" },
  ];

  return (
    <>
      {battleStage === "prompt" && (
        <p id="battlePrompt">
          {/* Only ask for what is actually missing — telling someone with a
              full party to add a hero is asking them to do something they
              have already done.

              No "on the left" either: the managers are a rail down the side of
              a wide window and a row across the top of a portrait one, so the
              direction was wrong on a phone. The buttons say what they are. */}
          {heroes.length === 0 && monsters.length === 0
            ? "Please add a Hero and a Monster with the Managers."
            : heroes.length === 0
              ? "Please add a Hero with the Hero Manager."
              : "Please add a Monster with the Monster Manager."}
        </p>
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
              {sortedCombatants.map((combatant, index) => {
                const isCurrent = index === safeTurnIndex;
                const isDead = combatant.conditions.includes("Dead");
                const isDying = combatant.conditions.includes("Death Saves");

                /* EXPERIMENT: cross out the slain (see utils/experiments.ts).
                   Monsters only — a hero on 0 is unconscious and rolling death
                   saves, and crossing them off would say they are gone when the
                   party can still reach them. Delete this const and the
                   `slainClass` below to remove. */
                const isSlain =
                  CROSS_OUT_SLAIN_MONSTERS &&
                  combatant.type === "monster" &&
                  (isDead || combatant.currHp <= 0);
                const slainClass = isSlain ? " isSlain" : "";
                const hero = combatant.type === "hero"
                  ? heroes.find((h) => h.id === combatant.id)
                  : undefined;

                return (
                  <tr
                    key={combatant.id}
                    role="row"
                    className={`combatantInfo${isCurrent ? ` isCurrentTurn ${turnCircleVariant(combatant.id)}` : ""}${slainClass}`}
                  >
                    <td role="cell" className={`combatantName ${underlineVariant(combatant.id)}`} style={underlineStyle(combatant.id)}>
                      {isCurrent && <span className="currentTurnIndicator" aria-hidden="true" />}

                      {combatant.type === "hero" ? (
                        // hero may be undefined if they were deleted mid-battle;
                        // HeroStatBlockHover handles that and falls back to the
                        // combatant's own data.
                        <HeroStatBlockHover hero={hero} combatant={combatant}>
                          <span className={`combatantNameText${isDead ? " strike" : ""}`} title={combatant.name}>{combatant.name}</span>
                        </HeroStatBlockHover>
                      ) : combatant.type === "monster" ? (
                        /* EXPERIMENT: a slain monster has no stat panel. There
                           is nothing left to look up, and the panel is a large
                           sheet that slides over the rows still fighting — so
                           the one row you no longer care about was the easiest
                           one to open by accident. The name stays clickable-
                           looking nowhere: no trigger, no underline, no
                           pointer. */
                        isSlain ? (
                          <span className="combatantNameText strike" title={combatant.name}>{combatant.name}</span>
                        ) : (
                          <MonsterStatBlockHover
                            monster={combatantToMonster(combatant)}
                            currentHp={combatant.currHp}
                            updateCombatant={updateCombatant}
                          >
                            <span className={`combatantNameText${isDead ? " strike" : ""}`} title={combatant.name}>{combatant.name}</span>
                          </MonsterStatBlockHover>
                        )
                      ) : (
                        <span className="combatantNameText" title={combatant.name}>{combatant.name}</span>
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
                        onClick={() => setHpModalId(combatant.id)}
                        title="Click to change HP"
                      >
                        {combatant.tHp > 0 && (
                          <span className="thp">
                            {/* The same drawn shield the HP window uses — this
                                was the only emoji left in the tracker. */}
                            <img src={TempHpIcon} alt="" aria-hidden="true" className="thpIcon" />
                            {combatant.tHp}
                          </span>
                        )}
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
            logHpChange(hpModalCombatant, newHp, newtHp);
            setCombatants((prev) =>
              prev
                .map((c) => (c.id === hpModalCombatant.id ? { ...c, currHp: newHp, tHp: newtHp } : c))
                .sort((a, b) => b.initiative - a.initiative)
            );
          }}
          onUpdateBoth={(newHp, newtHp, newConditions) => {
            logHpChange(hpModalCombatant, newHp, newtHp);
            setCombatants((prev) =>
              prev
                .map((c) =>
                  c.id === hpModalCombatant.id
                    ? { ...c, currHp: newHp, tHp: newtHp, conditions: newConditions }
                    : c
                )
                .sort((a, b) => b.initiative - a.initiative)
            );
            setHpModalId(null);
          }}
          onUpdateDeathSaves={(saves) => {
            setCombatants((prev) =>
              prev
                .map((c) => (c.id === hpModalCombatant.id ? { ...c, deathsaves: saves } : c))
                .sort((a, b) => b.initiative - a.initiative)
            );

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
            setHpModalId(null);
          }}
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
