import { useEffect } from "react";
import type { Combatant } from "../../types/index";
import { isShortcut } from "../../utils/shortcuts";
import type { UpdateCombatant } from "./useCombatantEdits";

/**
 * A, S and D tick Action, Bonus and Move for whoever's turn it is — never for
 * somebody dead or rolling death saves, who has nothing to spend.
 */
export function useTurnShortcuts(activeCombatant: Combatant | undefined, updateCombatant: UpdateCombatant) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isShortcut(e)) return;
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
}
