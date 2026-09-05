import { describe, it, expect } from 'vitest';
import { resolveDamage } from '../src/utils/damage';

/**
 * Regression coverage for the damage maths that used to be written out three
 * separate times (take damage, concentration passed, concentration failed).
 * The two concentration copies never applied the "dropped to 0" conditions, so
 * a concentrating hero could sit at 0 HP with no death saves and a
 * concentrating monster was never marked dead.
 */
describe('resolveDamage', () => {
  it('takes damage off hit points when there is no temp HP', () => {
    const r = resolveDamage(3, 10, 0, [], 'monster');
    expect(r.newHp).toBe(7);
    expect(r.newtHp).toBe(0);
  });

  it('spends temp HP first', () => {
    const r = resolveDamage(4, 10, 6, [], 'monster');
    expect(r.newtHp).toBe(2);
    expect(r.newHp).toBe(10);
  });

  it('carries the remainder past temp HP into real HP', () => {
    const r = resolveDamage(9, 10, 4, [], 'monster');
    expect(r.newtHp).toBe(0);
    expect(r.newHp).toBe(5);
  });

  it('never drops below zero', () => {
    const r = resolveDamage(999, 10, 0, [], 'monster');
    expect(r.newHp).toBe(0);
  });

  it('marks a monster dead at zero', () => {
    const r = resolveDamage(10, 10, 0, [], 'monster');
    expect(r.newHp).toBe(0);
    expect(r.conditions).toContain('Dead');
    expect(r.changed).toBe(true);
  });

  it('starts death saves for a hero at zero', () => {
    const r = resolveDamage(10, 10, 0, [], 'hero');
    expect(r.conditions).toContain('Death Saves');
  });

  it('applies the drop-to-zero conditions for a concentrating hero too', () => {
    // This is the case the old concentration path missed entirely.
    const r = resolveDamage(12, 10, 0, ['Concentrating'], 'hero');
    expect(r.newHp).toBe(0);
    expect(r.conditions).toContain('Death Saves');
    expect(r.conditions).toContain('Concentrating');
  });

  it('applies the drop-to-zero conditions for a concentrating monster too', () => {
    const r = resolveDamage(12, 10, 0, ['Concentrating'], 'monster');
    expect(r.conditions).toContain('Dead');
  });

  it('does not stack a second Death Saves on an already dying hero', () => {
    const r = resolveDamage(5, 0, 0, ['Death Saves'], 'hero');
    expect(r.conditions.filter((c) => c === 'Death Saves')).toHaveLength(1);
    expect(r.changed).toBe(false);
  });

  it('does not add Death Saves to a hero who is already dead', () => {
    const r = resolveDamage(5, 0, 0, ['Dead'], 'hero');
    expect(r.conditions).not.toContain('Death Saves');
  });

  it('leaves conditions alone while the target is still standing', () => {
    const r = resolveDamage(1, 10, 0, ['Prone'], 'hero');
    expect(r.conditions).toEqual(['Prone']);
    expect(r.changed).toBe(false);
  });
});
