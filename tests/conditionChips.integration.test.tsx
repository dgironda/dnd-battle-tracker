/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Combatant } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import BattleTracker from '../src/components/BattleTracker/BattleTracker';

/**
 * Conditions as drawn marks, with the chip workflow untouched.
 *
 * The chips carry Emily's status art instead of the condition's name now. What
 * must not change is everything around that: the cell still opens an editor
 * when clicked, a chip in the editor is still the button that removes it, and
 * the name is still there for anything that cannot see a picture — a screen
 * reader, or a condition nobody has drawn art for.
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

function combatant(id: string, name: string, initiative: number, conditions: string[]): Combatant {
  return {
    id, name, link: '', type: 'monster',
    currHp: 20, maxHp: 20, tHp: 0,
    initiative, init: 0,
    action: false, bonus: false, move: false, reaction: false,
    conditions, deathsaves: [],
    ac: 12, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, pp: 10,
  };
}

const DRAWN = combatant('cc-a', 'Aldric', 20, ['Prone', 'Blinded']);
/* Nobody drew "Soaked" — it arrives from an older save or a shared encounter. */
const CUSTOM = combatant('cc-b', 'Brannoc', 10, ['Soaked']);

/* The tracker's own condition cells, in initiative order. Scoped on purpose:
   the side-car stat panels render chips for the same combatants, so a
   document-wide lookup finds whichever the DOM happens to hold first. */
const cells = () => [...document.querySelectorAll<HTMLElement>('.editConditions')];

/** Spend a combatant's whole turn, which is what hands it to the next one. */
const endTurn = (id: string) => {
  for (const key of ['action', 'bonus', 'move']) {
    fireEvent.click(document.getElementById(`${id}-${key}`) as HTMLInputElement);
  }
};
const editor = () => document.querySelector<HTMLElement>('.conditionEditOuter')!;
const markIn = (root: HTMLElement, condition: string) =>
  root.querySelector<HTMLElement>(`[data-condition="${condition}"]`);

function renderTracker() {
  render(
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>
          <BattleTracker />
        </CombatProvider>
      </RosterProvider>
    </GlobalProvider>,
  );
}

describe('condition chips', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
    const memory = memoryStorage();
    memory.setItem('storedCombatants', JSON.stringify([DRAWN, CUSTOM]));
    memory.setItem('storedHeroes', '[]');
    memory.setItem('storedMonsters', '[]');
    memory.setItem('currentTurnIndex', '0');
    memory.setItem('roundNumber', '1');
    memory.setItem(
      'appSettings',
      JSON.stringify({
        version: 'twentyFourteen', theme: 'light',
        conditionReminderOn: false, currentTurnTime: true, tourReady: false,
      }),
    );
    vi.stubGlobal('localStorage', memory);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a drawn mark for each condition, and still says its name', async () => {
    renderTracker();
    await screen.findByRole('table');

    const aldric = cells()[0];
    expect(markIn(aldric, 'Prone')).toBeTruthy();
    expect(markIn(aldric, 'Blinded')).toBeTruthy();

    /* The word is in the chip for a screen reader, just not on screen. */
    const chip = markIn(aldric, 'Prone')!.closest('.conditionName')!;
    expect(chip.textContent).toContain('Prone');
    expect(chip.querySelector('.visuallyHidden')).toBeTruthy();
  });

  it('falls back to the word when nothing is drawn for a condition', async () => {
    renderTracker();
    await screen.findByRole('table');

    const brannoc = cells()[1];
    expect(markIn(brannoc, 'Soaked')).toBeNull();
    expect(brannoc.textContent).toContain('Soaked');
  });

  it('still opens the editor, and a chip is still the button that removes it', async () => {
    renderTracker();
    await screen.findByRole('table');

    fireEvent.click(cells()[0]);

    /* The editing chip is a mark too — and it is named for what clicking does. */
    const remove = await screen.findByRole('button', { name: 'Remove Prone' });
    expect(remove.querySelector('[data-condition="Prone"]')).toBeTruthy();

    fireEvent.click(remove);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove Prone' })).toBeNull());
    /* Only the one clicked goes. */
    expect(screen.getByRole('button', { name: 'Remove Blinded' })).toBeInTheDocument();
  });

  it('counts up the rounds a condition has been held', async () => {
    /* The seeded battle is in round 1, so everything on it has been held for
       one round — and one is not a duration worth a badge. */
    renderTracker();
    await screen.findByRole('table');

    const prone = () => markIn(cells()[0], 'Prone')!.closest('.conditionName')!;
    expect(prone().querySelector('.conditionRounds')).toBeNull();

    /* Play the round out — Aldric, then Brannoc — and it wraps to round 2. */
    endTurn('cc-a');
    endTurn('cc-b');
    await waitFor(() => expect(screen.getByText(/Combat Round 2/)).toBeInTheDocument());

    await waitFor(() =>
      expect(prone().querySelector('.conditionRounds')?.textContent).toBe('2'),
    );
    /* And what a screen reader gets, since the badge is a bare numeral. */
    expect(prone().textContent).toContain('held 2 rounds');
  });

  it('still adds a condition from the picker, as a mark', async () => {
    renderTracker();
    await screen.findByRole('table');

    fireEvent.click(cells()[0]);
    const picker = await screen.findByRole('combobox', { name: /Add a condition to Aldric/i });
    fireEvent.change(picker, { target: { value: 'Poisoned' } });

    await waitFor(() => expect(markIn(editor(), 'Poisoned')).toBeTruthy());
  });
});
