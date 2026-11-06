/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Combatant } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import BattleTracker from '../src/components/BattleTracker/BattleTracker';
import { DialogHost } from '../src/utils/notify';

/**
 * While a fight runs, the ribbon's place is End Battle, and ending it takes a
 * typed word: a click that lands by accident mid-session can't throw a fight
 * away. Once it's over, Start the Battle comes back.
 */

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

function combatant(id: string, name: string, initiative: number, type: 'hero' | 'monster'): Combatant {
  return {
    id, name, link: '', type,
    currHp: 20, maxHp: 20, tHp: 0,
    initiative, init: 0,
    action: false, bonus: false, move: false, reaction: false,
    conditions: [], deathsaves: [],
    ac: 12, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, pp: 10,
  };
}

function renderTracker() {
  render(
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>
          <BattleTracker />
          <DialogHost />
        </CombatProvider>
      </RosterProvider>
    </GlobalProvider>,
  );
}

const endButton = () => document.getElementById('buttonEndBattle') as HTMLButtonElement | null;
const rows = () => document.querySelectorAll('#battleTracker tbody tr').length;

/** Click End Battle, type `word` into its prompt, and press its End Battle. */
async function endWith(word: string) {
  fireEvent.click(endButton()!);
  const dialog = await screen.findByRole('alertdialog', { name: 'End the battle' });
  expect(within(dialog).getByText('Type END to end the current battle.')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByPlaceholderText('END'), { target: { value: word } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'End Battle' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
}

beforeEach(() => {
  vi.stubGlobal('alert', vi.fn());
  const memory = memoryStorage();
  memory.setItem('storedCombatants', JSON.stringify([combatant('c-k', 'Kessa', 18, 'hero'), combatant('c-g', 'Goblin 1', 12, 'monster')]));
  memory.setItem('storedHeroes', JSON.stringify([{ id: 'h-k', name: 'Kessa', hp: 20, present: true }]));
  memory.setItem('storedMonsters', JSON.stringify([{ id: 'm-g', name: 'Goblin', hp: 7, present: true }]));
  memory.setItem('roundNumber', '2');
  memory.setItem('currentTurnIndex', '1');
  memory.setItem(
    'appSettings',
    JSON.stringify({ version: 'twentyFourteen', theme: 'light', conditionReminderOn: false, currentTurnTime: true, tourReady: false }),
  );
  vi.stubGlobal('localStorage', memory);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ending a battle', () => {
  it('shows End Battle in place of Start the Battle while a fight runs', async () => {
    renderTracker();
    await screen.findByRole('table');

    expect(endButton()).toHaveTextContent('End Battle');
    expect(document.getElementById('buttonStartBattle')).toBeNull();
  });

  it('keeps the fight when the word typed isn’t END', async () => {
    renderTracker();
    await screen.findByRole('table');

    await endWith('nope');

    expect(rows()).toBe(2);
    expect(endButton()).not.toBeNull();
  });

  it('keeps the fight when the prompt is cancelled', async () => {
    renderTracker();
    await screen.findByRole('table');

    fireEvent.click(endButton()!);
    const dialog = await screen.findByRole('alertdialog', { name: 'End the battle' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(rows()).toBe(2);
  });

  it('clears the fight on END, in any case, and brings Start the Battle back', async () => {
    renderTracker();
    await screen.findByRole('table');

    await endWith('end');

    await waitFor(() => expect(document.getElementById('buttonStartBattle')).not.toBeNull());
    expect(endButton()).toBeNull();
    expect(document.getElementById('battleTracker')).toBeNull();
    /* Back to a battle that hasn't started: round 0, nobody's turn. */
    expect(localStorage.getItem('roundNumber')).toBe('0');
  });
});
