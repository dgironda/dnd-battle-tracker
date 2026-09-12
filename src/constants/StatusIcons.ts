/**
 * The drawn mark for each condition.
 *
 * Emily's status art is one file per condition, named after it: "Death Saves"
 * is status_death-saves.svg, "Cursed-Str" is status_cursed-str.svg, "Exhausted
 * 3" is status_exhausted-3.svg. That is a rule rather than a coincidence, so
 * the lookup derives the filename instead of carrying a 42-line table beside
 * the 42-line list in Conditions.ts — two lists that would drift apart the
 * first time a condition was renamed.
 *
 * A condition with no file falls back to its name, so a custom one typed into
 * an older save, or one arriving in a shared encounter, still shows as a chip.
 * conditionIcons.test.ts keeps the art and the list in step in both
 * directions: no condition without a mark, no mark without a condition.
 */

/* Eager: a chip cannot wait on a promise to paint, and the whole set is line
   art — 42 files of about 2KB each. Vite hands back the built URL for each. */
const files = import.meta.glob("../assets/statussvgs/status_*.svg", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** "Death Saves" -> "death-saves". Case dropped, runs of space hyphenated. */
export function conditionSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

const bySlug: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const file = path.slice(path.lastIndexOf("/") + 1);
  bySlug[file.replace(/^status_/, "").replace(/\.svg$/, "")] = url;
}

/** The mark for a condition, or undefined if nothing is drawn for it. */
export function conditionIcon(name: string): string | undefined {
  return bySlug[conditionSlug(name)];
}

/** Every mark we ship, by slug. Exported for the test that pairs them up. */
export const statusIconSlugs: readonly string[] = Object.keys(bySlug).sort();
