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

/**
 * A hit on a combatant, as the HP window deals it: temp HP first; a hero
 * already dying takes failed death saves instead (hitAtZero); a hero who just
 * dropped starts a fresh set of saves. Every hit is kept as `lastHit`.
 * `result` is the plain damage maths, for the battle log.
 */
export function hitCombatant(target: Combatant, amount: number, crit: boolean): { updated: Combatant; result: ReturnType<typeof resolveDamage> } {
  const lastHit = stampHit(amount, crit);
  const dying = target.conditions.includes('Death Saves');
  const result = resolveDamage(amount, target.currHp, target.tHp, target.conditions, target.type);
  if (target.type === 'hero' && target.currHp === 0 && dying) {
    const down = hitAtZero(amount, crit, target.maxHp, target.deathsaves ?? [], target.conditions);
    return { updated: { ...target, conditions: down.conditions, deathsaves: down.deathsaves, lastHit }, result };
  }
  const dropped = result.conditions.includes('Death Saves') && !dying;
  const updated = { ...target, currHp: result.newHp, tHp: result.newtHp, conditions: result.conditions, ...(dropped ? { deathsaves: [] } : {}), lastHit };
  return { updated, result };
}
