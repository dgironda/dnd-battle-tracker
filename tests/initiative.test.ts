import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatModifier, parseInitiative, rollInitiative } from '../src/utils/initiative';

/** The arithmetic both initiative windows share. */

describe('initiative arithmetic', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rolls a d20 and adds the modifier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollInitiative(3)).toBe(4);

    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(rollInitiative(-2)).toBe(18);
  });

  it('writes a modifier the way the "1d20 +2" line reads it', () => {
    expect(formatModifier(2)).toBe('+2');
    expect(formatModifier(-1)).toBe('-1');
    expect(formatModifier(0)).toBe('');
  });

  it('reads a typed total, with zero and negatives allowed', () => {
    expect(parseInitiative('12')).toBe(12);
    expect(parseInitiative(' 7 ')).toBe(7);
    expect(parseInitiative('0')).toBe(0);
    expect(parseInitiative('-1')).toBe(-1);
  });

  it('counts an empty box, or one still being typed, as blank', () => {
    expect(parseInitiative('')).toBeNull();
    expect(parseInitiative('   ')).toBeNull();
    expect(parseInitiative('-')).toBeNull();
    expect(parseInitiative('twelve')).toBeNull();
  });
});
