import { useCallback, useEffect, useRef, useState } from "react";
import type { Combatant } from "../../types/index";

/**
 * The condition reminder: a card that comes up for whoever's turn it is, when
 * they have any conditions on them.
 */
export function useConditionReminder(activeCombatant: Combatant | undefined) {
  const [reminderCombatant, setReminderCombatant] = useState<Combatant | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);

  // Always-current handle on the active combatant, so the effect can read it
  // without taking a dependency on every mutation of the object.
  const activeCombatantRef = useRef(activeCombatant);
  activeCombatantRef.current = activeCombatant;

  // Keyed on the turn moving and on conditions being added or removed —
  // depending on the whole combatant would reopen the reminder on every HP
  // change during that turn.
  const activeCombatantId = activeCombatant?.id;
  const activeConditionCount = activeCombatant?.conditions.length ?? 0;
  useEffect(() => {
    const current = activeCombatantRef.current;
    if (!current || activeConditionCount === 0) {
      setReminderOpen(false);
      return;
    }
    setReminderCombatant(current);
    setReminderOpen(true);
  }, [activeCombatantId, activeConditionCount]);

  const closeReminder = useCallback(() => setReminderOpen(false), []);

  return { reminderCombatant, reminderOpen, closeReminder };
}
