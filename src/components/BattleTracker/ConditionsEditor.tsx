import React, { useEffect } from "react";
import type { Combatant } from "../../types/index";
import { conditionOptions } from "../../constants/Conditions";
import ConditionMark from "./ConditionMark";
import { roundsHeld } from "../../utils/conditionRounds";
import { useConditionTip } from "./useConditionTip";

interface ConditionsEditorProps {
  combatant: Combatant;
  /** The round on the table, against which each condition's age is worked out. */
  roundNumber: number;
  isEditing: boolean;
  conditionDescriptions: Record<string, string>;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onAdd: (id: string, condition: string) => void;
  onRemove: (id: string, condition: string) => void;
}

/**
 * A combatant's conditions cell in the tracker.
 *
 * Its own component at module scope. It used to live inside BattleTracker's
 * body, so React saw a brand-new component type on every render and remounted
 * the whole subtree — losing focus and the open <select> mid-edit.
 */
export const ConditionsEditor: React.FC<ConditionsEditorProps> = ({
  combatant,
  roundNumber,
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
              onMouseEnter={(e) => showTip(e, conditionName, conditionDescriptions[conditionName], roundsHeld(combatant, conditionName, roundNumber))}
              onMouseLeave={hideTip}
              onFocus={(e) => showTip(e, conditionName, conditionDescriptions[conditionName], roundsHeld(combatant, conditionName, roundNumber))}
              onBlur={hideTip}
              aria-label={`Remove ${conditionName}`}
              aria-describedby={tipName === conditionName ? tipId : undefined}
            >
              <ConditionMark
              name={conditionName}
              rounds={roundsHeld(combatant, conditionName, roundNumber)}
            />
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
            onMouseEnter={(e) => showTip(e, conditionName, conditionDescriptions[conditionName], roundsHeld(combatant, conditionName, roundNumber))}
            onMouseLeave={hideTip}
            aria-describedby={tipName === conditionName ? tipId : undefined}
          >
            <ConditionMark
              name={conditionName}
              rounds={roundsHeld(combatant, conditionName, roundNumber)}
            />
          </span>
        ))}
      </button>
      {tipNode}
    </>
  );
};
