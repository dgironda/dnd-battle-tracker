import { describe, it, expect } from 'vitest';
import monsters2014 from '../src/assets/2014monsters.json';
import monsters2024 from '../src/assets/2024monsters.json';

/**
 * Every monster in both lists links to its own page on 5e.tools.
 *
 * A third of the 2014 list once linked to "#skeleton_['creature', 'mm', ...]":
 * the creature's whole tag list where its book belongs. 5e.tools opened on its
 * bestiary without finding the monster, and nothing on our side looked wrong.
 */

/** 5e.tools' own shape: the lower-cased name, escaped, then "_" and the book's code. */
const BESTIARY_LINK = /^https:\/\/5e\.tools\/bestiary\.html#[^#[\]\s"]+_[a-z0-9]+$/;

const linkOf = (list: { name: string; link: string }[], name: string) =>
  list.find((m) => m.name === name)?.link;

describe('monster stat block links', () => {
  it.each([
    ['2014', monsters2014],
    ['2024', monsters2024],
  ])('are all name-and-book links to 5e.tools in the %s list', (_, list) => {
    const broken = (list as { name: string; link: string }[]).filter((m) => !BESTIARY_LINK.test(m.link));
    expect(broken.map((m) => `${m.name}: ${m.link}`)).toEqual([]);
  });

  it('send a Skeleton to the right book for each set of rules', () => {
    expect(linkOf(monsters2014, 'Skeleton')).toBe('https://5e.tools/bestiary.html#skeleton_mm');
    expect(linkOf(monsters2024, 'Skeleton')).toBe('https://5e.tools/bestiary.html#skeleton_xmm');
  });
});
