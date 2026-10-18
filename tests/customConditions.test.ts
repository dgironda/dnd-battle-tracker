import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CONDITION_NAME_LIMIT,
  cleanConditionName,
  getCustomConditions,
  isCustomCondition,
  rememberCustomCondition,
  resolveConditionName,
} from '../src/utils/customConditions';

/**
 * Conditions typed into the picker: what a typed name turns into, and the
 * list of made-up names the picker offers again.
 */

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

describe('a typed condition name', () => {
  it('is tidied: spaces closed up, and a capital to start', () => {
    expect(cleanConditionName('  slowed   down ')).toBe('Slowed down');
    expect(cleanConditionName('hunter\'s mark')).toBe('Hunter\'s mark');
  });

  it('is nothing at all when nothing was typed', () => {
    expect(cleanConditionName('')).toBeNull();
    expect(cleanConditionName('   ')).toBeNull();
  });

  it('is cut to what a chip can hold', () => {
    const long = cleanConditionName('a'.repeat(40))!;
    expect(long).toHaveLength(CONDITION_NAME_LIMIT);
    /* A cut that lands on a space does not leave it hanging off the end. */
    expect(cleanConditionName(`${'b'.repeat(CONDITION_NAME_LIMIT - 1)} tail`)).toBe(
      `B${'b'.repeat(CONDITION_NAME_LIMIT - 2)}`,
    );
  });

  it('is one of ours when it is one of ours, however it was spelled', () => {
    expect(resolveConditionName('prone', [])).toBe('Prone');
    expect(resolveConditionName('DEATH SAVES', [])).toBe('Death Saves');
    expect(resolveConditionName('cursed str', [])).toBe('Cursed-Str');
    expect(resolveConditionName('exhausted-3', [])).toBe('Exhausted 3');
  });

  it('keeps the spelling of one already made', () => {
    expect(resolveConditionName('SLOWED', ['Slowed'])).toBe('Slowed');
  });

  it('is new otherwise', () => {
    expect(resolveConditionName('  hasted ', ['Slowed'])).toBe('Hasted');
    expect(resolveConditionName('', ['Slowed'])).toBeNull();
  });

  it('is custom unless we ship it', () => {
    expect(isCustomCondition('Hasted')).toBe(true);
    expect(isCustomCondition('Prone')).toBe(false);
    expect(isCustomCondition('Concentrating')).toBe(false);
  });
});

describe('the names made so far', () => {
  let memory: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    memory = memoryStorage();
    vi.stubGlobal('localStorage', memory);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('start empty', () => {
    expect(getCustomConditions()).toEqual([]);
  });

  it('put the latest first, and move one back to the front when it is used again', () => {
    rememberCustomCondition('Slowed');
    rememberCustomCondition('Hasted');
    expect(getCustomConditions()).toEqual(['Hasted', 'Slowed']);

    rememberCustomCondition('Slowed');
    expect(getCustomConditions()).toEqual(['Slowed', 'Hasted']);
  });

  it('hold one of each, whatever its case', () => {
    rememberCustomCondition('Slowed');
    rememberCustomCondition('slowed');
    expect(getCustomConditions()).toEqual(['slowed']);
  });

  it('keep the last dozen, so a typo drops off in time', () => {
    for (let i = 1; i <= 14; i++) rememberCustomCondition(`Mark ${i}`);
    const names = getCustomConditions();
    expect(names).toHaveLength(12);
    expect(names[0]).toBe('Mark 14');
    expect(names).not.toContain('Mark 1');
    expect(names).not.toContain('Mark 2');
  });

  it('never take in one of ours', () => {
    rememberCustomCondition('Prone');
    expect(getCustomConditions()).toEqual([]);
  });

  it('come back as the same array until they change, as React needs', () => {
    rememberCustomCondition('Slowed');
    const first = getCustomConditions();
    expect(getCustomConditions()).toBe(first);

    rememberCustomCondition('Hasted');
    expect(getCustomConditions()).not.toBe(first);
  });

  it('shrug off whatever else is in storage', () => {
    memory.setItem('customConditions', '{"not":"a list"}');
    expect(getCustomConditions()).toEqual([]);

    memory.setItem('customConditions', 'not even JSON');
    expect(getCustomConditions()).toEqual([]);

    /* Junk entries go, and so does a name we have since started shipping. */
    memory.setItem('customConditions', JSON.stringify(['Slowed', 7, null, 'Prone']));
    expect(getCustomConditions()).toEqual(['Slowed']);
  });
});
