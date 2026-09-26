/**
 * Reading values off a hero or monster for the side-car stat panels (see
 * StatPanel.tsx). Kept out of that file because it exports components, and
 * fast refresh needs a component file to export nothing else.
 */

/** A stored value, or the fallback when it is missing. */
export const orDefault = <T,>(value: T | undefined | null, fallback: T): T =>
  value !== undefined && value !== null ? value : fallback;

/** An ability score's modifier as it is written on a sheet: +2, +0, -1. */
export function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
