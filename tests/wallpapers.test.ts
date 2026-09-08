import { describe, it, expect } from 'vitest';
import {
  WALLPAPERS,
  DEFAULT_WALLPAPER,
  isWallpaperId,
  wallpaperById,
} from '../src/constants/Wallpapers';

describe('wallpaper catalogue', () => {
  it('has unique ids', () => {
    const ids = WALLPAPERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ships exactly one dark paper — the theme rides on it', () => {
    expect(WALLPAPERS.filter((w) => w.dark)).toHaveLength(1);
    expect(WALLPAPERS.find((w) => w.dark)?.id).toBe('midnight');
  });

  it('gives every paper a swatch colour and a label', () => {
    for (const w of WALLPAPERS) {
      expect(w.label.length).toBeGreaterThan(0);
      expect(w.swatch).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('defaults to a paper it actually ships', () => {
    expect(isWallpaperId(DEFAULT_WALLPAPER)).toBe(true);
  });

  it('recognises its own ids and nothing else', () => {
    expect(isWallpaperId('moss')).toBe(true);
    expect(isWallpaperId('chartreuse')).toBe(false);
    expect(isWallpaperId(undefined)).toBe(false);
    expect(isWallpaperId(null)).toBe(false);
    expect(isWallpaperId(7)).toBe(false);
  });

  it('falls back to the first paper for an id it no longer ships', () => {
    expect(wallpaperById('moss').label).toBe('Moss');
    // a stored setting can outlive the list it came from
    expect(wallpaperById('chartreuse' as never)).toBe(WALLPAPERS[0]);
  });
});
