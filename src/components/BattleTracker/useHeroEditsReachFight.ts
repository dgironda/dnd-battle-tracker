import { useEffect } from "react";
import type { Combatant, Hero } from "../../types/index";

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
export function useHeroEditsReachFight(
  heroes: Hero[],
  setCombatants: React.Dispatch<React.SetStateAction<Combatant[]>>,
) {
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
}
