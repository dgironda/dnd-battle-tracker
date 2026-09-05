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
