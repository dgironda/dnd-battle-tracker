/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Combatant } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import BattleTracker from '../src/components/BattleTracker/BattleTracker';

/**
 * Turn order, driven through the real tracker.
 *
 * There is no "next turn" button: the turn moves on when the active combatant
 * has Action, Bonus and Move all ticked. So these tests play a fight the way a
 * DM does — by ticking boxes — and read the result off the boxes, which is the
 * only record of the fight the DM actually sees.
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

/* Initiative order: Aldric, then Brannoc, then Cressa. */
const ALDRIC = combatant('to-a', 'Aldric', 20);
const BRANNOC = combatant('to-b', 'Brannoc', 15);
const CRESSA = combatant('to-c', 'Cressa', 10);

function renderTracker() {
  return render(
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>
          <BattleTracker />
        </CombatProvider>
      </RosterProvider>
    </GlobalProvider>,
  );
}

const box = (id: string, key: 'action' | 'bonus' | 'move' | 'reaction') =>
  document.getElementById(`${id}-${key}`) as HTMLInputElement;

const tick = (id: string, key: 'action' | 'bonus' | 'move' | 'reaction') =>
  fireEvent.click(box(id, key));

/** Spend a combatant's whole turn — which is what hands it to the next one. */
const endTurn = (id: string) => {
  tick(id, 'action');
  tick(id, 'bonus');
  tick(id, 'move');
};

const whoseTurn = () => document.querySelector('.isCurrentTurn')?.textContent ?? '';

describe('turn order', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
    const memory = memoryStorage();
    memory.setItem('storedCombatants', JSON.stringify([ALDRIC, BRANNOC, CRESSA]));
    memory.setItem('storedHeroes', '[]');
    memory.setItem('storedMonsters', '[]');
    memory.setItem('currentTurnIndex', '0');
    memory.setItem('roundNumber', '1');
    memory.setItem(
      'appSettings',
      JSON.stringify({
        version: 'twentyFourteen',
        theme: 'light',
        /* Off, so a reminder dialog cannot sit in front of the boxes. */
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

  it("gives a reaction back at the start of its owner's turn, not at the top of the round", async () => {
    renderTracker();
    await screen.findByRole('table');
    await waitFor(() => expect(whoseTurn()).toContain('Aldric'));

    /* Round 1. Aldric acts. */
    endTurn('to-a');
    await waitFor(() => expect(whoseTurn()).toContain('Brannoc'));

    /* Brannoc's turn. Aldric, whose turn is over, takes an opportunity attack. */
    tick('to-a', 'reaction');
    endTurn('to-b');
    await waitFor(() => expect(whoseTurn()).toContain('Cressa'));

    /* Cressa's turn. Brannoc — whose turn has ALSO already been — takes one too.
       This is the case the bug lives in: a reaction spent after its owner's
       turn, with the round about to wrap before that owner goes again. */
    tick('to-b', 'reaction');
    expect(box('to-b', 'reaction').checked).toBe(true);
    endTurn('to-c');

    /* Round 2, and Aldric is first. */
    await waitFor(() => expect(screen.getByText(/Combat Round 2/)).toBeInTheDocument());
    await waitFor(() => expect(whoseTurn()).toContain('Aldric'));

    /* Aldric's turn has started, so his reaction is back. */
    expect(box('to-a', 'reaction').checked).toBe(false);

    /* Brannoc's has NOT started — Aldric is still acting — so his is still
       spent. The top of the round is not the start of Brannoc's turn. */
    expect(box('to-b', 'reaction').checked).toBe(true);

    /* Action, Bonus and Move are still cleared for everybody at the wrap. That
       part is deliberate and unchanged — see the note in handleNextTurn. */
    for (const id of ['to-a', 'to-b', 'to-c']) {
      for (const key of ['action', 'bonus', 'move'] as const) {
        expect(box(id, key).checked).toBe(false);
      }
    }

    /* Aldric finishes. Now it is Brannoc's turn, and only now does he get it back. */
    endTurn('to-a');
    await waitFor(() => expect(whoseTurn()).toContain('Brannoc'));
    expect(box('to-b', 'reaction').checked).toBe(false);
  });

  it('does not hand the turn back when a reaction is unticked', async () => {
    /* Unticking an earlier combatant's Action, Bonus or Move hands the turn back
       to them. A reaction is not part of that record — using one is not taking a
       turn — so changing it must leave the turn exactly where it is. */
    renderTracker();
    await screen.findByRole('table');

    endTurn('to-a');
    await waitFor(() => expect(whoseTurn()).toContain('Brannoc'));

    tick('to-a', 'reaction');
    tick('to-a', 'reaction');
    expect(box('to-a', 'reaction').checked).toBe(false);
    expect(whoseTurn()).toContain('Brannoc');
  });
});
