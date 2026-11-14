import { Combatant } from '../types/index';

/**
 * Work out the result of applying `damage` to a combatant, temp HP first.
 *
 * This lived inline in three separate places (take-damage, concentration
 * passed, concentration failed) and the two concentration copies never got the
 * "dropped to 0" handling, so a concentrating character could sit at 0 HP with
 * no death saves and a concentrating monster was never marked dead.
 */
export function resolveDamage(
  damage: number,
  currentHp: number,
  tHp: number,
  conditions: string[],
  type: Combatant['type']
): { newHp: number; newtHp: number; conditions: string[]; changed: boolean } {
  const absorbedByTemp = Math.min(tHp, damage);
  const newtHp = tHp - absorbedByTemp;
  const newHp = Math.max(0, currentHp - (damage - absorbedByTemp));

  const next = [...conditions];
  if (newHp <= 0) {
    if (type === 'hero' && !next.includes('Death Saves') && !next.includes('Dead')) {
      next.push('Death Saves');
    } else if (type === 'monster' && !next.includes('Dead')) {
      next.push('Dead');
    }
  }

  return {
    newHp,
    newtHp,
    conditions: next,
    changed: next.length !== conditions.length,
  };
}

/** The most damage one hit can say it did (dmOS's protocol MAX_HIT). */
const MAX_HIT = 9999;

/**
 * A hit as it was dealt, before temp HP and 0 took their share, stamped with
 * when (ms). It sits on the combatant (Combatant.lastHit) so dmOS can pass it
 * to a linked sheet with the vitals it changed: a hit on a hero already at 0
 * changes no hit points, and is still a failed death save there.
 */
export function stampHit(amount: number, crit: boolean, at = Date.now()): { amount: number; crit: boolean; at: number } {
  return { amount: Math.min(Math.max(0, Math.trunc(amount)), MAX_HIT), crit, at };
}

/**
 * Damage to a hero already at 0 and dying: one failed death save, two for a
 * crit, and dead outright when the hit is at least their maximum hit points
 * (or the failures reach three). Returns the death saves and conditions after.
 */
export function hitAtZero(
  damage: number,
  crit: boolean,
  maxHp: number,
  deathsaves: boolean[],
  conditions: string[]
): { deathsaves: boolean[]; conditions: string[]; dead: boolean } {
  const saves = [...deathsaves, ...(crit ? [false, false] : [false])];
  const dead = damage >= maxHp || saves.filter((s) => s === false).length >= 3;
  if (!dead) return { deathsaves: saves, conditions, dead };
  const next = conditions.filter((c) => c !== 'Death Saves');
  if (!next.includes('Dead')) next.push('Dead');
  return { deathsaves: [], conditions: next, dead };
}

/** Conditions with Death Saves swapped for Dead. */
const killed = (conditions: string[]): string[] => [...conditions.filter((c) => c !== 'Death Saves' && c !== 'Dead'), 'Dead'];

/**
 * A hit on a hero already at 0 (dying, or stable): temp HP soaks it first,
 * and only what gets through counts. A stable hero starts dying again, their
 * successes cleared, then takes the failure (hitAtZero).
 */
function hitHeroAtZero(target: Combatant, amount: number, crit: boolean, newtHp: number): Partial<Combatant> {
  const through = amount - (target.tHp - newtHp);
  if (through <= 0) return { tHp: newtHp };
  const dying = target.conditions.includes('Death Saves');
  const saves = (target.deathsaves ?? []).filter((s) => dying || s === false);
  const down = hitAtZero(through, crit, target.maxHp, saves, dying ? target.conditions : [...target.conditions, 'Death Saves']);
  return { tHp: newtHp, conditions: down.conditions, deathsaves: down.deathsaves };
}

/**
 * A hit on a combatant, as the HP window and dmOS deal it: temp HP first. A
 * hero already at 0 takes failed death saves instead (hitHeroAtZero). A hero
 * who drops starts a fresh set of saves, or dies outright when the damage
 * left over past 0 is at least their maximum (massive damage). Every hit is
 * kept as `lastHit`. `result` is the plain damage maths, for the battle log.
 */
export function hitCombatant(target: Combatant, amount: number, crit: boolean): { updated: Combatant; result: ReturnType<typeof resolveDamage> } {
  const lastHit = stampHit(amount, crit);
  const result = resolveDamage(amount, target.currHp, target.tHp, target.conditions, target.type);
  const alive = !target.conditions.includes('Dead');
  const hero = target.type === 'hero' && alive;
  // A monster the DM gave death saves to is dying the same way.
  if (target.currHp === 0 && (hero || (alive && target.conditions.includes('Death Saves')))) {
    return { updated: { ...target, ...hitHeroAtZero(target, amount, crit, result.newtHp), lastHit }, result };
  }
  const leftover = amount - (target.tHp - result.newtHp) - target.currHp;
  const massive = hero && result.newHp === 0 && leftover >= target.maxHp;
  const dropped = result.conditions.includes('Death Saves') && !target.conditions.includes('Death Saves');
  const conditions = massive ? killed(result.conditions) : result.conditions;
  const saves = massive || dropped ? { deathsaves: [] } : {};
  return { updated: { ...target, currHp: result.newHp, tHp: result.newtHp, conditions, ...saves, lastHit }, result };
}
