import { useCallback, useRef } from "react";
import type { Combatant } from "../../types/index";
import { track } from "../../utils/telemetry";
import { byInitiative, followTurn } from "../../utils/turnOrder";
import type { useCombat } from "./CombatContext";

type Combat = ReturnType<typeof useCombat>;

export type UpdateCombatant = (
  combatantId: string,
  field: keyof Combatant,
  value: string | number | boolean | string[]
) => void;

const numericFields: (keyof Combatant)[] = [
  "hp", "currHp", "maxHp", "ac", "str", "dex", "con", "int", "wis", "cha", "pp", "init", "tHp",
];

interface CombatantEditsInputs extends Pick<Combat, "combatants" | "setCombatants" | "logEvent"> {
  /** Whose turn it is, as a position in initiative order (clamped). */
  turnIndex: number;
  setTurnIndex: (index: number) => void;
}

/**
 * The edits the tracker makes to combatants in a running fight, and what each
 * one writes to the battle log.
 */
export function useCombatantEdits({
  combatants,
  setCombatants,
  logEvent,
  turnIndex,
  setTurnIndex,
}: CombatantEditsInputs) {
  /* Read at the moment of an edit rather than taken as dependencies, so
     updateCombatant keeps one identity for every row it is handed to. */
  const latest = useRef({ combatants, turnIndex });
  latest.current = { combatants, turnIndex };

  const updateCombatant = useCallback<UpdateCombatant>((combatantId, field, value) => {
    const edit = (list: Combatant[]) =>
      list
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
        .sort(byInitiative);

    /* A corrected total moves its row, and the turn is a position in this
       order, so it moves with the person it points at. Without that, fixing
       a late roll mid-round handed the turn to whoever slid into the slot.
       The box saves on every keystroke, so typing "16" moves the row twice;
       the turn follows both times. */
    if (field === "initiative") {
      const before = latest.current.combatants;
      const after = edit(before);
      setCombatants(after);
      setTurnIndex(followTurn(before, latest.current.turnIndex, after));
      return;
    }

    setCombatants((prev) => edit(prev));
  }, [setCombatants, setTurnIndex]);

  /** Set several fields on one combatant at once, keeping the initiative order. */
  const patchCombatant = useCallback((combatantId: string, patch: Partial<Combatant>) => {
    setCombatants((prev) =>
      prev.map((c) => (c.id === combatantId ? { ...c, ...patch } : c)).sort(byInitiative)
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

  return { updateCombatant, patchCombatant, logHpChange, addCondition, removeCondition };
}
