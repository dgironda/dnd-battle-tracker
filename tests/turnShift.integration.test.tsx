/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Combatant, Hero } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import BattleTracker from '../src/components/BattleTracker/BattleTracker';
import HeroManager from '../src/components/HeroManager/HeroManager';

/**
 * The turn stays with whoever is acting when the order changes under them.
 *
 * The turn is a position in initiative order, so a total corrected mid-round,
 * or somebody joining the fight, used to slide the turn onto whoever moved into
 * that position. Manual initiative makes it a common case: the player who was
 * away gets rolled for, comes back, and has their real total typed in.
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

function combatant(id: string, name: string, initiative: number): Combatant {
  return {
    id,
    name,
    link: '',
    type: 'monster',
    currHp: 20,
    maxHp: 20,
    tHp: 0,
    initiative,
    init: 0,
    action: false,
    bonus: false,
    move: false,
    reaction: false,
    conditions: [],
    deathsaves: [],
    ac: 12,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
  };
}

const GERWIN: Hero = {
  id: 'ts-gerwin',
  name: 'Gerwin',
  player: 'Zach',
  hp: 30,
  tHp: 0,
  ac: 15,
  str: 14,
  dex: 12,
  con: 13,
  int: 10,
  wis: 11,
  cha: 9,
  pp: 12,
  init: 1,
  conditions: [],
  present: true,
  maxHp: 30,
  currHp: 30,
  link: '',
};

beforeEach(() => {
  vi.stubGlobal('alert', vi.fn());
  const memory = memoryStorage();
  memory.setItem(
    'storedCombatants',
    JSON.stringify([
      combatant('ts-a', 'Aldric', 20),
      combatant('ts-b', 'Brannoc', 15),
      combatant('ts-c', 'Cressa', 10),
    ]),
  );
  memory.setItem('storedHeroes', JSON.stringify([GERWIN]));
  memory.setItem('storedMonsters', '[]');
  memory.setItem('currentTurnIndex', '0');
  memory.setItem('roundNumber', '1');
  memory.setItem(
    'appSettings',
    JSON.stringify({
      version: 'twentyFourteen',
      theme: 'light',
      conditionReminderOn: false,
      currentTurnTime: true,
      tourReady: false,
    }),
  );
  vi.stubGlobal('localStorage', memory);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderFight({ withHeroManager = false } = {}) {
  return render(
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>
          <BattleTracker />
          {withHeroManager && <HeroManager onClose={() => {}} />}
        </CombatProvider>
      </RosterProvider>
    </GlobalProvider>,
  );
}

const box = (id: string, key: 'action' | 'bonus' | 'move') =>
  document.getElementById(`${id}-${key}`) as HTMLInputElement;
const tick = (id: string, key: 'action' | 'bonus' | 'move') => fireEvent.click(box(id, key));
const endTurn = (id: string) => {
  tick(id, 'action');
  tick(id, 'bonus');
  tick(id, 'move');
};

const whoseTurn = () => document.querySelector('.isCurrentTurn .combatantNameText')?.textContent ?? '';
const order = () =>
  [...document.querySelectorAll('#battleTracker tbody .combatantNameText')].map((n) => n.textContent);

/** Type a new total into a row's initiative box the way a DM does, a key at a time. */
function correctInitiative(name: string, total: string) {
  const row = [...document.querySelectorAll('#battleTracker tbody tr')].find(
    (r) => r.querySelector('.combatantNameText')?.textContent === name,
  )!;
  fireEvent.click(row.querySelector('td.combatantInit .setEditingField')!);
  const input = row.querySelector('td.combatantInit input') as HTMLInputElement;
  for (let typed = 1; typed <= total.length; typed++) {
    fireEvent.change(input, { target: { value: total.slice(0, typed) } });
  }
  fireEvent.blur(input);
}

/** Round 1, Aldric has acted, and it is Brannoc's turn. */
async function brannocActing(options?: { withHeroManager?: boolean }) {
  renderFight(options);
  /* By id: the Hero Manager, when it is up, has a table of its own. */
  await waitFor(() => expect(document.querySelector('#battleTracker')).not.toBeNull());
  endTurn('ts-a');
  await waitFor(() => expect(whoseTurn()).toBe('Brannoc'));
}

describe('when the order changes mid-round', () => {
  it('keeps the turn on whoever is acting when a total is corrected above them, then gives the late one their turn', async () => {
    await brannocActing();

    /* Cressa's real roll comes in: 18, which puts her above Brannoc. */
    correctInitiative('Cressa', '18');
    await waitFor(() => expect(order()).toEqual(['Aldric', 'Cressa', 'Brannoc']));
    expect(whoseTurn()).toBe('Brannoc');

    /* Her place in the round has gone by, so she goes once Brannoc is done. */
    endTurn('ts-b');
    await waitFor(() => expect(whoseTurn()).toBe('Cressa'));

    endTurn('ts-c');
    await waitFor(() => expect(screen.getByText(/Combat Round 2/)).toBeInTheDocument());
    expect(whoseTurn()).toBe('Aldric');
  });

  it("keeps the turn when the acting combatant's own total is corrected", async () => {
    await brannocActing();

    correctInitiative('Brannoc', '25');
    await waitFor(() => expect(order()).toEqual(['Brannoc', 'Aldric', 'Cressa']));
    expect(whoseTurn()).toBe('Brannoc');

    /* Aldric has acted already, so it is Cressa next. */
    endTurn('ts-b');
    await waitFor(() => expect(whoseTurn()).toBe('Cressa'));
  });

  it('lets somebody who joins above the acting combatant go once that turn ends', async () => {
    await brannocActing({ withHeroManager: true });

    fireEvent.click(screen.getByRole('button', { name: /join the fray/i }));
    await screen.findByRole('dialog', { name: 'Initiative for Gerwin' });
    fireEvent.change(screen.getByLabelText('Initiative total'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(order()).toEqual(['Aldric', 'Gerwin', 'Brannoc', 'Cressa']));
    expect(whoseTurn()).toBe('Brannoc');

    /* A box ticked and cleared further down is not a turn being taken back,
       and must not hand the turn to Gerwin early either. */
    tick('ts-c', 'move');
    tick('ts-c', 'move');
    expect(whoseTurn()).toBe('Brannoc');

    endTurn('ts-b');
    await waitFor(() => expect(whoseTurn()).toBe('Gerwin'));
    endTurn(GERWIN.id);
    await waitFor(() => expect(whoseTurn()).toBe('Cressa'));
    endTurn('ts-c');
    await waitFor(() => expect(screen.getByText(/Combat Round 2/)).toBeInTheDocument());
    expect(whoseTurn()).toBe('Aldric');
  });

  it('lets somebody who joins below the acting combatant wait for their place', async () => {
    await brannocActing({ withHeroManager: true });

    fireEvent.click(screen.getByRole('button', { name: /join the fray/i }));
    await screen.findByRole('dialog', { name: 'Initiative for Gerwin' });
    fireEvent.change(screen.getByLabelText('Initiative total'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(order()).toEqual(['Aldric', 'Brannoc', 'Gerwin', 'Cressa']));
    expect(whoseTurn()).toBe('Brannoc');

    endTurn('ts-b');
    await waitFor(() => expect(whoseTurn()).toBe('Gerwin'));
  });

  it('still hands the turn back when a box is unticked on somebody who has already gone', async () => {
    await brannocActing();

    tick('ts-a', 'action');
    await waitFor(() => expect(whoseTurn()).toBe('Aldric'));
  });
});
