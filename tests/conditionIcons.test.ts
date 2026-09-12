import { describe, it, expect } from 'vitest';
import { predefinedConditions } from '../src/constants/Conditions';
import { conditionIcon, conditionSlug, statusIconSlugs } from '../src/constants/StatusIcons';

/**
 * The art and the condition list, kept in step.
 *
 * The chips show a drawn mark instead of a word now, and the two sides of that
 * are in different places: the list of conditions in Conditions.ts, the files
 * in assets/statussvgs. Nothing in the type system pairs them, so these do —
 * in both directions, because a condition with no mark is a chip that falls
 * back to text and a mark with no condition is art nobody can reach.
 */
describe('condition marks', () => {
  it('has one for every condition the picker offers', () => {
    const missing = predefinedConditions.filter((name) => !conditionIcon(name));
    expect(missing).toEqual([]);
  });

  it('ships none that no condition uses', () => {
    const wanted = new Set(predefinedConditions.map(conditionSlug));
    expect(statusIconSlugs.filter((slug) => !wanted.has(slug))).toEqual([]);
  });

  it('points each condition at its own file', () => {
    /* The awkward shapes, since the plain ones would pass on any rule at all:
       a space, a digit, a hyphen already in the name. */
    expect(conditionIcon('Death Saves')).toContain('status_death-saves.svg');
    expect(conditionIcon('Exhausted 3')).toContain('status_exhausted-3.svg');
    expect(conditionIcon('Cursed-Str')).toContain('status_cursed-str.svg');
    expect(conditionIcon('Faerie Fire')).toContain('status_faerie-fire.svg');
  });

  it('does not care how a name is cased or padded', () => {
    expect(conditionIcon('  prone ')).toBe(conditionIcon('Prone'));
  });

  it('leaves a condition it has no art for without one, rather than guessing', () => {
    /* Custom conditions reach the tracker through old saves and shared
       encounters; ConditionMark falls back to the word for these. */
    expect(conditionIcon('Soaked')).toBeUndefined();
    expect(conditionIcon('')).toBeUndefined();
  });
});
