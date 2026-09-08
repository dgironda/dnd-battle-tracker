import { describe, it, expect } from 'vitest';
import { rankByName, scoreName, MATCH_TIER } from '../src/utils/searchRank';

/** The thirteen names in the 2014 set that contain "skeleton", in file order. */
const SKELETONS = [
  'Dinosaur Skeleton',
  'Dwarf Skeleton',
  'Frost Giant Skeleton',
  'Giant Shark Skeleton',
  'Giant Skeleton',
  'Incomplete Dragon Skeleton',
  'Minotaur Skeleton',
  'Ogre Skeleton',
  'Skeleton',
  'Skeleton Key',
  'Storm Giant Skeleton',
  'Thunderbeast Skeleton',
  'Warhorse Skeleton',
];

const rank = (names: string[], query: string, limit = 20) =>
  rankByName(names, query, (n) => n, limit);

describe('scoreName', () => {
  it('tiers an exact match above a prefix, a word start and a substring', () => {
    expect(scoreName('Skeleton', 'skeleton')).toBe(MATCH_TIER.exact);
    expect(scoreName('Skeleton Key', 'skeleton')).toBe(MATCH_TIER.prefix);
    expect(scoreName('Warhorse Skeleton', 'skeleton')).toBe(MATCH_TIER.wordStart);
    expect(scoreName('Skeleton', 'keleto')).toBe(MATCH_TIER.substring);
  });

  it('is case and whitespace insensitive', () => {
    expect(scoreName('Skeleton', '  SKELETON ')).toBe(MATCH_TIER.exact);
    expect(scoreName('Adult Amethyst Dragon', 'adult   amethyst')).toBe(MATCH_TIER.prefix);
  });

  it('matches every query word in any order', () => {
    expect(scoreName('Adult Amethyst Dragon', 'dragon adult')).toBe(MATCH_TIER.allWords);
    // ...but only when they are all there
    expect(scoreName('Adult Amethyst Dragon', 'dragon goblin')).toBeNull();
  });

  it('matches initials for the long names', () => {
    // "abd" appears nowhere in "ancient blue dragon" as a run of characters
    expect(scoreName('Ancient Blue Dragon', 'abd')).toBe(MATCH_TIER.initials);
    expect(scoreName('Ancient Blue Dragon', 'ab')).toBe(MATCH_TIER.initials);
    // a closer match always wins: the name starts with this letter
    expect(scoreName('Adult Amethyst Dragon', 'a')).toBe(MATCH_TIER.prefix);
  });

  it('returns null for a miss and for an empty query', () => {
    expect(scoreName('Skeleton', 'goblin')).toBeNull();
    expect(scoreName('Skeleton', '')).toBeNull();
    expect(scoreName('Skeleton', '   ')).toBeNull();
  });
});

describe('rankByName', () => {
  it('puts the exact match first — the bug this exists to fix', () => {
    // In file order "Skeleton" is ninth of thirteen.
    expect(SKELETONS.indexOf('Skeleton')).toBe(8);
    expect(rank(SKELETONS, 'skeleton')[0]).toBe('Skeleton');
  });

  it('orders prefix matches above word-start matches', () => {
    const out = rank(SKELETONS, 'skeleton');
    expect(out.slice(0, 2)).toEqual(['Skeleton', 'Skeleton Key']);
    // everything after those two is a word-start match
    expect(out.slice(2)).toContain('Warhorse Skeleton');
    expect(out.indexOf('Skeleton Key')).toBeLessThan(out.indexOf('Warhorse Skeleton'));
  });

  it('prefers the shorter name within a tier', () => {
    const out = rank(['Giant Shark Skeleton', 'Giant Skeleton'], 'skeleton');
    expect(out).toEqual(['Giant Skeleton', 'Giant Shark Skeleton']);
  });

  it('returns every match, not just the ones found first', () => {
    expect(rank(SKELETONS, 'skeleton')).toHaveLength(SKELETONS.length);
  });

  it('honours the limit', () => {
    expect(rank(SKELETONS, 'skeleton', 3)).toHaveLength(3);
  });

  it('returns nothing for an empty query', () => {
    expect(rank(SKELETONS, '')).toEqual([]);
  });

  it('finds a name whose words are typed out of order', () => {
    const names = ['Adult Amethyst Dragon', 'Adult Red Dragon', 'Skeleton'];
    expect(rank(names, 'dragon amethyst')).toEqual(['Adult Amethyst Dragon']);
  });
});
