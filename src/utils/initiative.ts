/**
 * The arithmetic behind both ways of asking for initiative: one combatant at a
 * time (InitiativeDialog) and everyone at once in a table (InitiativeTable).
 * Kept here so the two roll the same way and read a typed total the same way.
 */

/** A d20 plus the combatant's modifier: what pressing Roll does. */
export function rollInitiative(modifier: number): number {
  return Math.floor(Math.random() * 20) + 1 + modifier;
}

/** "+2" or "-1", and nothing at all for a flat 0, as the "1d20 +2" line reads. */
export function formatModifier(modifier: number): string {
  if (modifier === 0) return "";
  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * What a typed initiative box holds: a number, or null for nothing yet.
 *
 * Negative and zero totals are legal: a natural 1 with a -2 Dex modifier
 * really is -1. A box can hold "" or a lone "-" while someone is mid-way
 * through typing, and both count as blank.
 */
export function parseInitiative(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
