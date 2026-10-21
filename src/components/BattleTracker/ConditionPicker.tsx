import { useEffect, useRef, useState } from "react";
import { conditionChoices, useConditionRules } from "../../utils/conditionRules";
import {
  CONDITION_NAME_LIMIT,
  isCustomCondition,
  rememberCustomCondition,
  resolveConditionName,
  useCustomConditions,
} from "../../utils/customConditions";

/* The list's last entry: type a condition we don't ship. Its value starts
   with a space, which no condition's name can, because typed names are
   trimmed (see cleanConditionName). */
const NEW_CONDITION = " new";

interface ConditionPickerProps {
  /** Whose conditions these are, for the labels. */
  name: string;
  /** What they already have, which the list leaves out. */
  held: readonly string[];
  /** Put a condition on: one picked from the list, or a name typed in. */
  onPick: (condition: string) => void;
}

/**
 * "+ Add Condition": the conditions we ship, then the DM's own under "Your
 * conditions", ending with "New condition…".
 *
 * That last one swaps the picker for a text box until the name is added or
 * let go. It stays a real <select> otherwise, so a phone still opens its own
 * list for it, and Firefox's dark theme keeps the fix in conditions.css.
 */
export default function ConditionPicker({ name, held, onPick }: ConditionPickerProps) {
  const typed = useCustomConditions();
  /* The campaign's own list (dmOS's Rules Manager), or what we ship. A name
     on the campaign's list is a choice above, not one of "Your conditions". */
  const choices = conditionChoices(useConditionRules());
  const made = typed.filter((n) => !choices.includes(n));
  const [naming, setNaming] = useState(false);
  const pickerRef = useRef<HTMLSelectElement>(null);
  /* Enter and Escape hand the keyboard back to the picker, ready for the next
     one. A click somewhere else leaves focus where the click put it. */
  const refocusPicker = useRef(false);
  /* Enter removes the box while it still has focus, and a browser can report
     a blur on its way out. One finish per box. */
  const finished = useRef(false);

  useEffect(() => {
    if (!naming && refocusPicker.current) {
      refocusPicker.current = false;
      pickerRef.current?.focus();
    }
  }, [naming]);

  const pick = (condition: string) => {
    if (isCustomCondition(condition)) rememberCustomCondition(condition);
    onPick(condition);
  };

  const finishNaming = (typed: string, refocus: boolean) => {
    if (finished.current) return;
    finished.current = true;
    refocusPicker.current = refocus;
    setNaming(false);
    const condition = resolveConditionName(typed, [...choices, ...made]);
    if (condition) pick(condition);
  };

  if (naming) {
    return (
      <input
        type="text"
        className="conditionInput"
        autoFocus
        maxLength={CONDITION_NAME_LIMIT}
        placeholder="Name it"
        autoComplete="off"
        enterKeyHint="done"
        aria-label={`Name a new condition for ${name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            finishNaming(e.currentTarget.value, true);
          } else if (e.key === "Escape") {
            e.preventDefault();
            finishNaming("", true);
          }
        }}
        /* Typed and then clicked away, or a phone's keyboard closed with its
           own Done: either way the name was meant. Only an empty box is let
           go. */
        onBlur={(e) => finishNaming(e.currentTarget.value, false)}
      />
    );
  }

  return (
    <select
      ref={pickerRef}
      onChange={(e) => {
        if (e.target.value === NEW_CONDITION) {
          finished.current = false;
          setNaming(true);
        } else if (e.target.value) {
          pick(e.target.value);
          e.target.value = "";
        }
      }}
      className="conditionSelect"
      name="conditionSelect"
      aria-label={`Add a condition to ${name}`}
    >
      <option className="addConditionBox" value="">+ Add Condition</option>
      {choices
        .filter((condition) => !held.includes(condition))
        .map((condition) => (
          <option key={condition} value={condition}>{condition}</option>
        ))}
      {/* The bottom of the list is the DM's own: the names made so far, then
          the way to make another. */}
      <optgroup label="Your conditions">
        {made
          .filter((condition) => !held.includes(condition))
          .sort((a, b) => a.localeCompare(b))
          .map((condition) => (
            <option key={condition} value={condition}>{condition}</option>
          ))}
        <option value={NEW_CONDITION}>New condition…</option>
      </optgroup>
    </select>
  );
}
