/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalProvider } from '../src/hooks/optionsContext';
import OptionsPanel from '../src/components/OptionsPanel';
import { PAPER_STYLES, WALLPAPERS, tileUrl } from '../src/constants/Wallpapers';

/**
 * Picking paper, which is two choices rather than one.
 *
 * The point of the grid is that each half is previewed in the other: the
 * styles are drawn in the colour you are on, the colours in the style you are
 * on. So the assertions here are about what each button SHOWS, not only about
 * what it sets — a picker that changes the page correctly while previewing the
 * wrong art is the failure worth catching.
 */

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

function renderOptions({ isSupporter = true, onLockedPick = vi.fn() } = {}) {
  render(
    <GlobalProvider>
      <OptionsPanel onClose={() => {}} isSupporter={isSupporter} onLockedPick={onLockedPick} />
    </GlobalProvider>,
  );
  return { onLockedPick };
}

/** The colour buttons carry their pairing; the style buttons carry it on their tile. */
const colourSwatch = (name: string | RegExp) => screen.getByRole('radio', { name });
const styleTile = (name: string) =>
  screen.getByRole('radio', { name }).querySelector('.paperStyleTile') as HTMLElement;

describe('the paper picker', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    document.documentElement.removeAttribute('data-wallpaper');
    document.documentElement.removeAttribute('data-paper-style');
    document.documentElement.style.removeProperty('--paper-tile');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has art for every pairing, and no two are the same', () => {
    const seen = new Set<string>();
    for (const style of PAPER_STYLES) {
      for (const paper of WALLPAPERS) {
        const url = tileUrl(style.id, paper.id);
        expect(url, `${style.id}/${paper.id}`).toBeTruthy();
        seen.add(url);
      }
    }
    expect(seen.size).toBe(PAPER_STYLES.length * WALLPAPERS.length);
  });

  it('shows every colour in the style you are on', () => {
    renderOptions();
    expect(colourSwatch('Moss').dataset.tile).toBe('armoury-moss');

    fireEvent.click(screen.getByRole('radio', { name: 'Trinkets' }));

    /* Every colour repaints, not just the chosen one. */
    for (const paper of WALLPAPERS) {
      expect(colourSwatch(paper.label).dataset.tile).toBe(`trinkets-${paper.id}`);
    }
    expect(colourSwatch('Moss').style.backgroundImage).toContain('bg_pattern-icons-green.svg');
  });

  it('shows both styles in the colour you are on', () => {
    renderOptions();
    expect(styleTile('Armoury').dataset.tile).toBe('armoury-parchment');

    fireEvent.click(colourSwatch('Midnight'));

    expect(styleTile('Armoury').dataset.tile).toBe('armoury-midnight');
    expect(styleTile('Trinkets').dataset.tile).toBe('trinkets-midnight');
    expect(styleTile('Trinkets').style.backgroundImage).toContain('bg_pattern-icons-dark.svg');
  });

  it('keeps each half of the choice when the other one changes', () => {
    renderOptions();
    fireEvent.click(screen.getByRole('radio', { name: 'Trinkets' }));
    fireEvent.click(colourSwatch('Ember'));

    expect(document.documentElement.dataset.paperStyle).toBe('trinkets');
    expect(document.documentElement.dataset.wallpaper).toBe('ember');
    expect(document.documentElement.style.getPropertyValue('--paper-tile')).toContain(
      'bg_pattern-icons-orange.svg',
    );

    /* Back to Armoury, and Ember stays. */
    fireEvent.click(screen.getByRole('radio', { name: 'Armoury' }));
    expect(document.documentElement.dataset.wallpaper).toBe('ember');
    expect(document.documentElement.style.getPropertyValue('--paper-tile')).toContain(
      'bg_pattern-weapons-orange.svg',
    );
  });

  it('still lets the theme ride along with Midnight', () => {
    renderOptions();
    fireEvent.click(colourSwatch('Midnight'));
    expect(document.documentElement.dataset.theme).toBe('dark');

    fireEvent.click(colourSwatch('Parchment'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('leaves the paper alone when a locked colour is picked, and asks instead', () => {
    const { onLockedPick } = renderOptions({ isSupporter: false });

    /* Locked swatches are named "<colour>, supporters only". */
    fireEvent.click(colourSwatch(/^Amethyst/));

    expect(onLockedPick).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.wallpaper).toBe('parchment');
  });

  it('does not lock the styles — they are free on the free papers', () => {
    renderOptions({ isSupporter: false });

    /* Deliberate, not accidental: the gate exists (see PaperStyle), and both
       of these are set free. A style shipped locked should fail this. */
    expect(document.querySelectorAll('.paperStyleTile.isLocked')).toHaveLength(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Trinkets' }));

    expect(document.documentElement.dataset.paperStyle).toBe('trinkets');
    expect(document.documentElement.style.getPropertyValue('--paper-tile')).toContain(
      'bg_pattern-icons-beige.svg',
    );
  });
});
