/**
 * The paper the page is dressed in, in the order the Options grid shows it.
 *
 * Two choices make one paper: a STYLE (which motifs are drawn) and a COLOUR
 * (what they are drawn on). Every pairing has art, so the two are independent
 * — picking Trinkets keeps your colour, picking Midnight keeps your style.
 *
 * This is the one list. The settings type, the picker and the CSS all follow
 * it: adding a colour means an entry here, a tile for it in each style, and a
 * rule in fixes.css keyed on `html[data-wallpaper="<id>"]` for its opacity.
 *
 * `swatch` is the tile's own ground colour, sampled from the artwork. It sits
 * behind the tile in the picker, so a preview shows the colour the page will
 * actually take even for the moment before the image has loaded.
 *
 * Only Midnight is a dark page. Choosing it switches the app's theme, which is
 * what the old "Switch to Dark Mode" button did — that button is this grid
 * now, so the theme rides along with the wallpaper rather than being a
 * separate switch that could disagree with it.
 */

import armouryParchment from "../assets/draftsvgs_v2/bg_pattern-weapons-beige.svg";
import armourySlate from "../assets/draftsvgs_v2/bg_pattern-weapons-grey.svg";
import armouryMoss from "../assets/draftsvgs_v2/bg_pattern-weapons-green.svg";
import armouryEmber from "../assets/draftsvgs_v2/bg_pattern-weapons-orange.svg";
import armouryRose from "../assets/draftsvgs_v2/bg_pattern-weapons-pink.svg";
import armouryAmethyst from "../assets/draftsvgs_v2/bg_pattern-weapons-purple.svg";
import armouryMidnight from "../assets/draftsvgs_v2/bg_pattern-weapons-dark.svg";

import trinketsParchment from "../assets/draftsvgs_v2/bg_pattern-icons-beige.svg";
import trinketsSlate from "../assets/draftsvgs_v2/bg_pattern-icons-grey.svg";
import trinketsMoss from "../assets/draftsvgs_v2/bg_pattern-icons-green.svg";
import trinketsEmber from "../assets/draftsvgs_v2/bg_pattern-icons-orange.svg";
import trinketsRose from "../assets/draftsvgs_v2/bg_pattern-icons-pink.svg";
import trinketsAmethyst from "../assets/draftsvgs_v2/bg_pattern-icons-purple.svg";
import trinketsMidnight from "../assets/draftsvgs_v2/bg_pattern-icons-dark.svg";

export interface Wallpaper {
  id: WallpaperId;
  label: string;
  /** The tile's ground colour. */
  swatch: string;
  /** True for the one that puts the app into its dark theme. */
  dark: boolean;
  /**
   * Locked for everyone but supporters. Parchment and Slate are free, which
   * keeps a light and a neutral paper available to everybody; the colours and
   * the dark paper are the perk. Note that dark mode was already behind this
   * gate before the grid replaced the theme button, so nothing that used to be
   * free has been taken away.
   */
  supporterOnly: boolean;
}

export type WallpaperId =
  | "parchment"
  | "moss"
  | "ember"
  | "rose"
  | "amethyst"
  | "slate"
  | "midnight";

export const WALLPAPERS: readonly Wallpaper[] = [
  { id: "parchment", label: "Parchment", swatch: "#ebddcc", dark: false, supporterOnly: false },
  { id: "slate", label: "Slate", swatch: "#d7d7d7", dark: false, supporterOnly: false },
  { id: "moss", label: "Moss", swatch: "#b0d883", dark: false, supporterOnly: true },
  { id: "ember", label: "Ember", swatch: "#f8be87", dark: false, supporterOnly: true },
  { id: "rose", label: "Rose", swatch: "#f1aebc", dark: false, supporterOnly: true },
  { id: "amethyst", label: "Amethyst", swatch: "#e0d3ee", dark: false, supporterOnly: true },
  { id: "midnight", label: "Midnight", swatch: "#1d1f21", dark: true, supporterOnly: true },
] as const;

export const DEFAULT_WALLPAPER: WallpaperId = "parchment";

/** Whether an id is one we still ship — stored settings outlive the list. */
export function isWallpaperId(value: unknown): value is WallpaperId {
  return WALLPAPERS.some((w) => w.id === value);
}

export function wallpaperById(id: WallpaperId): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
}

/* -------------------------------------------------------------- the styles */

export type PaperStyleId = "armoury" | "trinkets";

export interface PaperStyle {
  id: PaperStyleId;
  label: string;
  /** What is actually drawn on it, since the name alone will not say. */
  blurb: string;
  /** Same gate the colours use. Nothing sets it yet — see the note below. */
  supporterOnly: boolean;
}

/**
 * These two are free. The colours are the supporter perk and the style is not:
 * a DM on the free Parchment can still have either set of motifs, which costs
 * nothing to give and makes the choice worth making.
 *
 * A style added later can be locked by setting `supporterOnly` — the picker
 * already draws the lock and raises the Patreon prompt from it, exactly as the
 * colours do.
 */
export const PAPER_STYLES: readonly PaperStyle[] = [
  { id: "armoury", label: "Armoury", blurb: "Swords, arrows and shields", supporterOnly: false },
  { id: "trinkets", label: "Trinkets", blurb: "Dice, hearts, horns and charms", supporterOnly: false },
] as const;

export const DEFAULT_PAPER_STYLE: PaperStyleId = "armoury";

export function isPaperStyleId(value: unknown): value is PaperStyleId {
  return PAPER_STYLES.some((s) => s.id === value);
}

/**
 * Every combination's tile.
 *
 * Typed as a full Record of both dimensions on purpose: a style added without
 * art for all seven colours, or a colour added without art in both styles, is
 * a build error here rather than a page that quietly loses its wallpaper.
 */
const TILES: Record<PaperStyleId, Record<WallpaperId, string>> = {
  armoury: {
    parchment: armouryParchment,
    slate: armourySlate,
    moss: armouryMoss,
    ember: armouryEmber,
    rose: armouryRose,
    amethyst: armouryAmethyst,
    midnight: armouryMidnight,
  },
  trinkets: {
    parchment: trinketsParchment,
    slate: trinketsSlate,
    moss: trinketsMoss,
    ember: trinketsEmber,
    rose: trinketsRose,
    amethyst: trinketsAmethyst,
    midnight: trinketsMidnight,
  },
};

/** The tile for one pairing. Used by the page and by every preview in Options. */
export function tileUrl(style: PaperStyleId, wallpaper: WallpaperId): string {
  return TILES[style][wallpaper];
}
