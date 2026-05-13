/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Combatant } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import BattleTracker from '../src/components/BattleTracker/BattleTracker';

function createMemoryLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

const sampleMonsterCombatant: Combatant = {
  id: 'it-grick',
  name: 'Grick',
  link: '',
  type: 'monster',
  currHp: 24,
  maxHp: 30,
  tHp: 0,
  initiative: 15,
  init: 3,
  action: false,
  bonus: false,
  move: false,
  reaction: false,
  conditions: [],
  deathsaves: [],
  ac: 14,
  str: 14,
  dex: 12,
  con: 11,
  int: 3,
  wis: 14,
  cha: 5,
  pp: 18,
};

function seedCombatLocalStorage(memory: ReturnType<typeof createMemoryLocalStorage>) {
  memory.setItem('storedCombatants', JSON.stringify([sampleMonsterCombatant]));
  memory.setItem('storedHeroes', '[]');
  memory.setItem('storedMonsters', '[]');
  memory.setItem('currentTurnIndex', '0');
  memory.setItem('roundNumber', '1');
  memory.setItem(
    'appSettings',
    JSON.stringify({
      version: 'twentyFourteen',
      theme: 'light',
      conditionReminderOn: true,
      currentTurnTime: true,
      tourReady: false,
    })
  );
}

function renderBattleTracker() {
  return render(
    <GlobalProvider>
      <CombatProvider>
        <BattleTracker setShowHeroManager={vi.fn()} setShowMonsterManager={vi.fn()} />
      </CombatProvider>
    </GlobalProvider>
  );
}

function getOpenHpModal() {
  const inner = document.querySelector('.hpChangeModalInner');
  if (!inner) {
    throw new Error('Expected HP modal (.hpChangeModalInner) to be open');
  }
  return within(inner as HTMLElement);
}

describe('BattleTracker + HpChangeModal (integration)', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
    const memory = createMemoryLocalStorage();
    seedCombatLocalStorage(memory);
    vi.stubGlobal('localStorage', memory);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens HP modal from the tracker table and applies damage via real callbacks', async () => {
    renderBattleTracker();

    const table = await screen.findByRole('table');
    expect(table).toHaveAttribute('id', 'battleTracker');

    const hpCell = await screen.findByTitle('Click to change HP');
    expect(hpCell).toHaveTextContent(/24\s*\/\s*30/);

    fireEvent.click(hpCell);

    await waitFor(() => {
      expect(document.querySelector('.hpChangeModalInner')).toBeTruthy();
    });
    const modal = getOpenHpModal();
    expect(modal.getByRole('heading', { level: 3, name: 'Grick' })).toBeInTheDocument();
    expect(modal.getByText(/Current HP: 24 \/ 30/)).toBeInTheDocument();

    fireEvent.change(modal.getByPlaceholderText('Enter amount'), { target: { value: '4' } });
    fireEvent.click(modal.getByRole('button', { name: 'Take Damage' }));

    await waitFor(() => {
      expect(document.querySelector('.hpChangeModalInner')).toBeNull();
    });

    const hpAfter = screen.getByTitle('Click to change HP');
    expect(hpAfter).toHaveTextContent(/20\s*\/\s*30/);
  });

  it('shows validation error when Take Damage is clicked with an empty amount', async () => {
    renderBattleTracker();

    fireEvent.click(await screen.findByTitle('Click to change HP'));
    await waitFor(() => {
      expect(document.querySelector('.hpChangeModalInner')).toBeTruthy();
    });
    const modal = getOpenHpModal();
    expect(modal.getByRole('heading', { level: 3, name: 'Grick' })).toBeInTheDocument();

    fireEvent.click(modal.getByRole('button', { name: 'Take Damage' }));
    expect(modal.getByText('Please enter a valid number')).toBeInTheDocument();
  });
});
