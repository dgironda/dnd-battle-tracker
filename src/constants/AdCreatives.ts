/**
 * The banners that go in rotation.
 *
 * **This is the file you edit.** Add an entry, drop the image in `public/ads/`,
 * rebuild. Everything else — picking one, holding the space, falling back when
 * nothing fits — reads from here and needs no changes.
 *
 * A typed array rather than JSON or XML on purpose: a wrong slot name, a
 * missing `alt`, a malformed date are all build errors here, and an ad that is
 * broken in production is one nobody notices for a month.
 *
 * Two things that matter for these being affiliate links rather than a network:
 *
 * - **Self-host the image.** Put it in `public/ads/` and reference it by path.
 *   A creative hotlinked from the merchant's CDN needs a CSP entry, can vanish
 *   without warning, and is trivially blocked; one served from our own origin
 *   is none of those things. That last part is the point — the visitors most
 *   likely to run a blocker are exactly the ones the annoyance is aimed at.
 * - **Disclosure is not optional.** Affiliate links are paid links: the slot
 *   carries a visible "Advertisement" label, and the `rel` on the anchor
 *   includes `sponsored`, which is what search engines require of a paid link.
 *   Both are handled by AdSlot; neither is something to remove.
 *
 * ## Sizes
 *
 * Match the slot or the image is letterboxed inside the box it reserved:
 *
 *   banner   728x90    above the roster
 *   tower    300x120   foot of the left-hand rail
 *
 * A file at `public/ads/foo.png` is served at `/ads/foo.png`, which is what
 * goes in `image`. Keep them small — this is decoration on a tool people open
 * mid-session, and a 400KB banner is 400KB the roster waited for.
 */

import type { AdSlotName } from "../components/AdSlot";

export interface AdCreative {
  /**
   * Stable, short, and never reused. It is what the click is reported under, so
   * renaming one splits its history in two.
   */
  id: string;
  /** Which box it fits. The sizes are in SLOTS — a banner will not fit a tower. */
  slot: AdSlotName;
  /** Path under public/, e.g. "/ads/dice-goblin.png". */
  image: string;
  /** Where the click goes. The affiliate link, with your tag already on it. */
  href: string;
  /** Required. Describes the ad, not the product — a screen reader user is
   *  being told what this thing in the page is. */
  alt: string;
  /**
   * How often this one comes up relative to the others in its slot. Default 1.
   * Two at weight 1 and one at weight 2 means the last shows half the time.
   */
  weight?: number;
  /**
   * Optional ISO date (YYYY-MM-DD) after which it stops appearing.
   *
   * Worth setting on anything tied to a sale or a season. An expired affiliate
   * link is worse than an empty slot: it still costs the visitor the annoyance
   * and returns a dead page, which is the one outcome with no upside.
   */
  until?: string;
}

/**
 * The live list.
 *
 * Empty is a valid state and the correct one right now — with nothing here every
 * slot falls back to the house "support us" promo, which is what ships today.
 */
export const AD_CREATIVES: readonly AdCreative[] = [
  /* ------------------------------------------------------------------------
     Copy one of these, fill it in, delete the comment markers.

  {
    id: "drivethru-core-rules",
    slot: "banner",
    image: "/ads/drivethru-core-rules.png",
    href: "https://www.drivethrurpg.com/...?affiliate_id=YOUR_ID",
    alt: "Advertisement: core rulebooks on DriveThruRPG",
    weight: 1,
  },
  {
    id: "dice-set-winter",
    slot: "tower",
    image: "/ads/dice-set-winter.png",
    href: "https://www.amazon.com/dp/...?tag=YOUR_TAG",
    alt: "Advertisement: polyhedral dice sets",
    until: "2026-12-31",
  },

     ------------------------------------------------------------------------ */
];

/**
 * The ones that could run in a slot right now.
 *
 * Exported for the tests, and because "why is my ad not showing" is a question
 * worth being able to answer from a console.
 */
export function eligibleCreatives(
  slot: AdSlotName,
  creatives: readonly AdCreative[] = AD_CREATIVES,
  now: Date = new Date(),
): AdCreative[] {
  return creatives.filter((creative) => {
    if (creative.slot !== slot) return false;
    if (!creative.until) return true;
    const expiry = new Date(`${creative.until}T23:59:59Z`);
    /* An unparseable date is treated as expired rather than as forever: a typo
       in a date should take an ad down, not pin it up permanently. */
    if (Number.isNaN(expiry.getTime())) return false;
    return expiry.getTime() >= now.getTime();
  });
}

/**
 * Choose one, weighted.
 *
 * Called once when the slot mounts, so a creative holds still for the whole
 * page view. Rotating under a reader mid-session would be genuinely hostile
 * rather than mildly annoying, and it would wreck the click-through besides.
 *
 * `random` is injectable so the tests are not a coin toss.
 */
export function pickCreative(
  slot: AdSlotName,
  creatives: readonly AdCreative[] = AD_CREATIVES,
  now: Date = new Date(),
  random: () => number = Math.random,
): AdCreative | null {
  const eligible = eligibleCreatives(slot, creatives, now);
  if (eligible.length === 0) return null;

  const total = eligible.reduce((sum, c) => sum + weightOf(c), 0);
  if (total <= 0) return null;

  let ticket = random() * total;
  for (const creative of eligible) {
    ticket -= weightOf(creative);
    if (ticket < 0) return creative;
  }
  /* Only reachable through floating-point drift at the very top of the range. */
  return eligible[eligible.length - 1];
}

/** Missing means 1; nonsense means 0, so a bad weight hides that ad rather
 *  than poisoning the draw for the others. */
function weightOf(creative: AdCreative): number {
  const weight = creative.weight ?? 1;
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}
