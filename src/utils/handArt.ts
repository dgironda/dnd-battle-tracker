import type { CSSProperties } from "react";

/**
 * The per-entity variation behind the hand-drawn art.
 *
 * Every stroke, box and tick is picked and nudged from a hash of the thing it
 * belongs to, so a row of them looks ruled by hand rather than stamped, and so
 * the same hero gets the same marks on every render and in every panel.
 */

const PENCIL_VARIANTS = 10;
const HAND_BOXES = 8;

/**
 * The three ways a box gets filled in, and how many drawn variants of each
 * there are. Which one a combatant uses is fixed for the whole row: nobody
 * ticks one box, crosses the next and scribbles out the third — they settle
 * into a habit and keep it.
 */
export const MARK_KINDS = ["Check", "Cross", "Fill"] as const;
export type MarkKind = (typeof MARK_KINDS)[number];

const MARK_COUNTS: Record<MarkKind, number> = { Check: 6, Cross: 4, Fill: 4 };

export function hash32(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

/** Hash to a value in [min, max], quantised so it stays stable and readable. */
export function hashRange(
  id: string,
  salt: string,
  min: number,
  max: number,
  steps = 24,
): number {
  const t = (hash32(`${id}:${salt}`) % steps) / (steps - 1);
  return +(min + t * (max - min)).toFixed(3);
}

/** Which of the drawn strokes this name gets. */
export function underlineVariant(id: string): string {
  return `pencil${(hash32(`${id}:pencil`) % PENCIL_VARIANTS) + 1}`;
}

const TURN_CIRCLES = 4;

/** Which scrawled circle gets drawn round this combatant when it is their go. */
export function turnCircleVariant(id: string): string {
  return `turnCircle${(hash32(`${id}:ring`) % TURN_CIRCLES) + 1}`;
}

/** The mark this combatant uses, the same one down their whole row. */
export function markKind(id: string): MarkKind {
  return MARK_KINDS[hash32(`${id}:markkind`) % MARK_KINDS.length];
}

/**
 * Which drawn box and which drawn mark this checkbox gets. The box still
 * varies per column; only the *kind* of mark is held steady across the row.
 * Pass `kind` where the mark has to mean something — a cross against "Ready?"
 * would read as "not ready".
 */
export function checkboxVariant(id: string, field: string, kind?: MarkKind): string {
  const box = (hash32(`${id}:${field}:box`) % HAND_BOXES) + 1;
  const k = kind ?? markKind(id);
  const mark = (hash32(`${id}:${field}:mark`) % MARK_COUNTS[k]) + 1;
  return `handBox${box} handMark${k}${mark}`;
}

/**
 * A little more per-checkbox variation than picking from a set can give: no
 * two boxes sit at quite the same angle or size, and the tick inside is drawn
 * a shade over or under the box, the way it is when someone is filling these
 * in quickly rather than lining them up.
 */
export function checkboxStyle(id: string, field: string): CSSProperties {
  return {
    "--cb-tilt": `${hashRange(id, `${field}:cbtilt`, -7, 7, 20)}deg`,
    "--cb-scale": `${hashRange(id, `${field}:cbscale`, 0.9, 1.08, 14)}`,
    "--cb-nudge": `${hashRange(id, `${field}:cbnudge`, -1.2, 1.2, 12)}px`,
  } as CSSProperties;
}

export function underlineStyle(id: string): CSSProperties {
  /* One "how hard did they lean on it" value, 0 to 1, drives four things at
     once — because they go together in life. A hard, deliberate stroke is
     thick, dark, slow, and runs past the end of the word; a quick flick is
     thin, faint, fast, and stops short. Varying them independently produced
     lines nobody draws: heavy but hurried, faint but laboured. */
  const press = hashRange(id, "press", 0, 1, 16);

  return {
    "--ul-tilt": `${hashRange(id, "tilt", -1.1, 1.1)}deg`,
    "--ul-drop": `${hashRange(id, "drop", -0.04, 0.05)}em`,
    "--ul-start": `${hashRange(id, "start", -0.05, 0.12)}em`,
    /* Light strokes stop well short of the last letter; heavy ones overshoot. */
    "--ul-end": `${(0.24 - press * 0.32).toFixed(3)}em`,
    "--ul-weight": `${(0.36 + press * 0.30).toFixed(3)}em`,
    "--ul-press": `${(0.38 + press * 0.57).toFixed(3)}`,
    /* A flick is quick; leaning on it takes a moment. Both stay close enough
       to the stat block's 0.35s slide that they still read as one gesture. */
    "--ul-time": `${(0.27 + press * 0.15).toFixed(3)}s`,
  } as CSSProperties;
}
