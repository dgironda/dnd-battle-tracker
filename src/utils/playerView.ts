import type { Combatant } from "../types/index";

/**
 * What the players are allowed to see.
 *
 * The DM's tracker holds a lot a party should not have: armour class, ability
 * scores, notes, links to stat blocks, and — the one that actually changes how
 * a fight is played — exact hit points. A table that can read "14 / 97" off a
 * screen knows precisely how many rounds the boss has left.
 *
 * So the player view is not the tracker with some fields hidden in CSS. It is
 * a separate, smaller shape built here, and only this shape is ever sent. If a
 * field is not in `PlayerCombatant`, it cannot leak by accident later — which
 * is why this is a projection rather than a filter.
 */

/** Hit points as a band rather than a number. */
export type HpBand = "unharmed" | "hurt" | "bloodied" | "critical" | "down";

export interface PlayerCombatant {
  id: string;
  name: string;
  type: "hero" | "monster";
  /** Their place in the order. The number is public — it is rolled openly. */
  initiative: number;
  hp: HpBand;
  conditions: string[];
  isCurrentTurn: boolean;
}

export interface PlayerView {
  /** Wire version, so an old player page can refuse a shape it cannot read. */
  v: 1;
  round: number;
  combatants: PlayerCombatant[];
  /** When the DM last pushed. Lets the player page show "a moment ago". */
  updated: number;
}

/**
 * The condition that hides a monster.
 *
 * The Monster Manager's "Hiding" toggle sets `hidden` on the monster AND adds
 * this condition (see toggleHidden), and conditions are what survive onto the
 * combatant when it joins the fray — `hidden` is not carried across. So the
 * condition is the honest signal on the battle side, and it is also the one
 * the DM can take away mid-fight when the thing steps out of the shadows.
 */
const CONCEALED = "Invisible";

/**
 * Bands are on the fraction of the maximum, which is the same ratio the DM's
 * own bloodied tint ramps on, so the two views agree about when something
 * looks hurt.
 *
 * Temporary hit points are deliberately NOT counted. They are a buffer the
 * party often does not know about, and folding them in would let a table infer
 * that a buff had landed.
 */
export function hpBand(currHp: number, maxHp: number): HpBand {
  if (currHp <= 0) return "down";
  if (maxHp <= 0) return "unharmed";

  const share = currHp / maxHp;
  if (share >= 1) return "unharmed";
  if (share > 0.5) return "hurt";
  if (share > 0.25) return "bloodied";
  return "critical";
}

/** Is this combatant one the party can see at all? */
function isVisible(c: Combatant): boolean {
  if (c.type === "hero") return true;
  return !c.conditions.includes(CONCEALED);
}

/**
 * Conditions the party may read.
 *
 * A monster never shows CONCEALED — but an invisible monster is dropped from
 * the list entirely above, so this only matters if the rules here and there
 * ever drift. Heroes keep everything, including invisibility: a party knows
 * what it did to itself.
 */
function visibleConditions(c: Combatant): string[] {
  if (c.type === "hero") return [...c.conditions];
  return c.conditions.filter((name) => name !== CONCEALED);
}

/**
 * Build the whole view. Sorted the way the tracker sorts, so the order on the
 * players' screen is the order the DM is reading down.
 *
 * `currentTurnId` rather than an index: the DM's index points into their own
 * sorted array, and this array is shorter whenever anything is hidden.
 */
export function toPlayerView(
  combatants: Combatant[],
  roundNumber: number,
  currentTurnId: string | null,
  now: number = Date.now()
): PlayerView {
  const visible = combatants
    .filter(isVisible)
    .slice()
    .sort((a, b) => b.initiative - a.initiative);

  return {
    v: 1,
    round: roundNumber,
    updated: now,
    combatants: visible.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      initiative: c.initiative,
      hp: hpBand(c.currHp, c.maxHp),
      conditions: visibleConditions(c),
      isCurrentTurn: c.id === currentTurnId,
    })),
  };
}
