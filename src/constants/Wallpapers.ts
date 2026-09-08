/**
 * The wallpapers a player can choose from, in the order they appear in the
 * Options grid.
 *
 * This is the one list: the settings type, the picker and the CSS all follow
 * it, so adding a colour means adding an entry here, a rule in fixes.css keyed
 * on `html[data-wallpaper="<id>"]`, and nothing else.
 *
 * `swatch` is the tile's own ground colour, sampled from the artwork. It is
 * what the picker paints behind the pattern preview, so the button shows the
 * colour the page will actually take rather than an approximation of it.
 *
 * Only Midnight is a dark page. Choosing it switches the app's theme, which is
 * what the old "Switch to Dark Mode" button did — that button is this grid
 * now, so the theme rides along with the wallpaper rather than being a
 * separate switch that could disagree with it.
 */
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
