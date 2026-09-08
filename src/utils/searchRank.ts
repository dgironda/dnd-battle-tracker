/**
 * Relevance ranking for the monster name autocomplete.
 *
 * The list used to be a plain `includes()` scan in the order the data file
 * happens to be in, cut off at the first 20 hits. Typing "skeleton" therefore
 * offered Dinosaur Skeleton, Dwarf Skeleton, Frost Giant Skeleton, Giant Shark
 * Skeleton, Giant Skeleton, Incomplete Dragon Skeleton, Minotaur Skeleton and
 * Ogre Skeleton before it offered "Skeleton" — ninth of thirteen, for the word
 * that was typed in full.
 *
 * Nothing clever is needed to fix that, only an ordering. Every candidate is
 * scored into one of a few tiers and the best are taken, rather than the first
 * few found:
 *
 *   0  the name IS the query                      "skeleton" -> Skeleton
 *   1  the name starts with the query             "skel"     -> Skeleton Key
 *   2  a word in the name starts with the query   "skel"     -> Warhorse Skeleton
 *   3  the query appears somewhere in the name    "keleto"   -> Skeleton
 *   4  every word of the query appears, in any    "dragon adult"
 *      order                                                 -> Adult Amethyst Dragon
 *   5  the query matches the name's initials      "aad"      -> Adult Amethyst Dragon
 *
 * Tiers 4 and 5 only ever ADD results that the old substring search missed;
 * they cannot push a closer match down, because a lower tier always wins.
 *
 * Within a tier the shorter name comes first — that is what puts "Skeleton"
 * above "Skeleton Key" — and then alphabetical order, so the list is stable
 * and does not reshuffle as the data file changes.
 */

export const MATCH_TIER = {
  exact: 0,
  prefix: 1,
  wordStart: 2,
  substring: 3,
  allWords: 4,
  initials: 5,
} as const;

/** The first letter of each word: "Adult Amethyst Dragon" -> "aad". */
function initialsOf(name: string): string {
  return name
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();
}

/**
 * How well `name` matches `query`, or null if it does not match at all.
 * Lower is better. See MATCH_TIER above for what each number means.
 */
export function scoreName(name: string, query: string): number | null {
  const haystack = name.toLowerCase().trim();
  const needle = query.toLowerCase().trim().replace(/\s+/g, " ");
  if (!needle || !haystack) return null;

  if (haystack === needle) return MATCH_TIER.exact;

  // One lookup covers the first three tiers: where the query lands in the name
  // is what separates "starts with" from "starts a word" from "somewhere in".
  const at = haystack.indexOf(needle);
  if (at === 0) return MATCH_TIER.prefix;
  if (at > 0) {
    const before = haystack[at - 1];
    return /[\p{L}\p{N}]/u.test(before) ? MATCH_TIER.substring : MATCH_TIER.wordStart;
  }

  const words = needle.split(" ").filter(Boolean);
  if (words.length > 1 && words.every((word) => haystack.includes(word))) {
    return MATCH_TIER.allWords;
  }

  // Initials are for the long ones — "aad" for Adult Amethyst Dragon. Two
  // letters minimum, or a single keystroke would match most of the book.
  if (words.length === 1 && needle.length >= 2 && initialsOf(name).includes(needle)) {
    return MATCH_TIER.initials;
  }

  return null;
}

/**
 * The best `limit` matches for `query`, most relevant first.
 *
 * Everything is scored before anything is cut, which is the whole point: the
 * old version stopped at the first 20 it stumbled across.
 */
export function rankByName<T>(
  items: readonly T[],
  query: string,
  nameOf: (item: T) => string,
  limit: number,
): T[] {
  const scored: { item: T; name: string; score: number }[] = [];

  for (const item of items) {
    const name = nameOf(item);
    const score = scoreName(name, query);
    if (score !== null) scored.push({ item, name, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return a.name.localeCompare(b.name);
  });

  return scored.slice(0, limit).map((entry) => entry.item);
}
