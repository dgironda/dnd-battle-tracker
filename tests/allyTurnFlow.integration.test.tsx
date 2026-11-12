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
 * A hero's ally with no turn of its own (noTurn: an echo, or a companion that
 * acts on its hero's turn) never holds the turn. Next Turn already passes over
 * one (tests/allyTurns.test.ts). These are the other ways the turn could land
 * on one: the ally sorting first as the fight starts, whoever was acting
 * leaving so the ally slides into their place, and a box unticked on an ally
 * above whoever is acting.
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

function combatant(id: string, name: string, initiative: number, over: Partial<Combatant> = {}): Combatant {
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
    ...over,
  };
}

/** An ally of `owner`'s, on its initiative: dmOS puts one in the fight that way. */
const ally = (id: string, name: string, initiative: number, owner: string, over: Partial<Combatant> = {}) =>
  combatant(id, name, initiative, { owner, noTurn: true, ...over });

/** An old turn start, so a test can tell whether the turn clock restarted. */
const EARLIER = '1000';

let memory: ReturnType<typeof memoryStorage>;

/** Round 1, the turn at the top of the order, and `fight` stored in this order. */
function seed(fight: Combatant[], { reminders = false } = {}) {
  memory = memoryStorage();
  memory.setItem('storedCombatants', JSON.stringify(fight));
  memory.setItem('storedHeroes', '[]');
  memory.setItem('storedMonsters', '[]');
  memory.setItem('currentTurnIndex', '0');
  memory.setItem('roundNumber', '1');
  memory.setItem('turnStartedAt', EARLIER);
  memory.setItem(
    'appSettings',
    JSON.stringify({
      version: 'twentyFourteen',
      theme: 'light',
      conditionReminderOn: reminders,
      currentTurnTime: true,
      tourReady: false,
    }),
  );
  vi.stubGlobal('localStorage', memory);
}

beforeEach(() => {
  vi.stubGlobal('alert', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function renderFight() {
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
  await waitFor(() => expect(document.querySelector('#battleTracker')).not.toBeNull());
}

type Box = 'action' | 'bonus' | 'move' | 'reaction';
const box = (id: string, key: Box) => document.getElementById(`${id}-${key}`) as HTMLInputElement;
const tick = (id: string, key: Box) => fireEvent.click(box(id, key));
const endTurn = (id: string) => {
  tick(id, 'action');
  tick(id, 'bonus');
  tick(id, 'move');
};

const stored = () => JSON.parse(memory.getItem('storedCombatants')!) as Combatant[];
const storedLog = () =>
  JSON.parse(memory.getItem('battleLog') ?? '[]') as { kind: string; who: string; detail?: string }[];

const whoseTurn = () => document.querySelector('.isCurrentTurn .combatantNameText')?.textContent ?? '';
const order = () =>
  [...document.querySelectorAll('#battleTracker tbody .combatantNameText')].map((n) => n.textContent);

/** Whose names the condition reminder came up for, among the nodes `records` added. */
function remindedIn(records: MutationRecord[]): string[] {
  return records
    .flatMap((r) => [...r.addedNodes])
    .flatMap((n) => {
      if (!(n instanceof HTMLElement)) return [];
      const card = n.id === 'conditionReminderOverlay' ? n : n.querySelector('#conditionReminderOverlay');
      return card ? [card.querySelector('h2')?.textContent ?? ''] : [];
    });
}

describe("an ally with no turn of its own", () => {
  it('passes the turn straight on when it sorts first as the fight starts', async () => {
    /* Tied with its hero and stored first, so it heads the order. */
    seed([ally('af-e', 'Echo', 20, 'af-q'), combatant('af-q', 'Qwint', 20), combatant('af-o', 'Ogre', 10)]);
    await renderFight();

    await waitFor(() => expect(whoseTurn()).toBe('Qwint'));
    expect(order()).toEqual(['Echo', 'Qwint', 'Ogre']);
    /* Passing over it is not the round turning over. */
    expect(screen.getByText('Combat Round 1')).toBeInTheDocument();
  });

  it('passes the turn on when whoever was acting leaves and the ally slides into their place', async () => {
    seed([
      combatant('af-a', 'Aldric', 20),
      combatant('af-q', 'Qwint', 15),
      ally('af-e', 'Echo', 15, 'af-q'),
      combatant('af-o', 'Ogre', 10),
    ]);
    await renderFight();
    endTurn('af-a');
    await waitFor(() => expect(whoseTurn()).toBe('Qwint'));

    fireEvent.click(document.getElementById('buttonEditBattle')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Qwint from the battle' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Remove from battle' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(order()).toEqual(['Aldric', 'Echo', 'Ogre']));
    await waitFor(() => expect(whoseTurn()).toBe('Ogre'));
    expect(screen.getByText('Combat Round 1')).toBeInTheDocument();
  });

  it("doesn't take the turn when a box is unticked on it, and doesn't start the acting one's turn over", async () => {
    seed([
      combatant('af-a', 'Aldric', 20),
      ally('af-e', 'Echo', 20, 'af-a'),
      combatant('af-b', 'Brannoc', 15),
      combatant('af-c', 'Cressa', 10),
    ]);
    await renderFight();

    /* The echo strikes on Aldric's turn, and then Aldric's turn ends. */
    tick('af-e', 'action');
    endTurn('af-a');
    await waitFor(() => expect(whoseTurn()).toBe('Brannoc'));
    tick('af-b', 'reaction');

    /* The DM puts the echo's record right. That isn't a turn being taken back. */
    tick('af-e', 'action');
    expect(box('af-e', 'action').checked).toBe(false);
    expect(whoseTurn()).toBe('Brannoc');
    /* Handing the turn to the echo would have passed it straight back, which
       starts Brannoc's turn over: his reaction would have come back. */
    expect(box('af-b', 'reaction').checked).toBe(true);
  });

  it("doesn't bring up the condition reminder, even for the moment the turn rests on it", async () => {
    seed(
      [ally('af-e', 'Echo', 20, 'af-q', { conditions: ['Prone'] }), combatant('af-q', 'Qwint', 20)],
      { reminders: true },
    );
    /* The card would come and go within the one update, so the final page
       can't show it: watch for it being added at all. */
    const reminded: string[] = [];
    const watch = new MutationObserver((records) => reminded.push(...remindedIn(records)));
    watch.observe(document.body, { childList: true, subtree: true });

    await renderFight();
    await waitFor(() => expect(whoseTurn()).toBe('Qwint'));
    reminded.push(...remindedIn(watch.takeRecords()));
    watch.disconnect();

    expect(reminded).toEqual([]);
  });

  it("doesn't open the death-save window for it", async () => {
    seed([
      ally('af-e', 'Echo', 20, 'af-q', { currHp: 0, conditions: ['Death Saves'] }),
      combatant('af-q', 'Qwint', 20),
    ]);
    await renderFight();

    await waitFor(() => expect(whoseTurn()).toBe('Qwint'));
    expect(screen.queryByRole('dialog', { name: 'Change HP for Echo' })).toBeNull();
  });

  it("logs its readied action lapsing with its hero's turn, as well as the hero's", async () => {
    seed([
      combatant('af-a', 'Aldric', 20),
      combatant('af-q', 'Qwint', 15, { conditions: ['Ready'] }),
      ally('af-w', 'Wolf', 15, 'af-q', { conditions: ['Ready'] }),
    ]);
    await renderFight();
    endTurn('af-a');
    await waitFor(() => expect(whoseTurn()).toBe('Qwint'));

    /* Both chips go as Qwint's turn starts, and nobody clicked either off, so
       the log says why for each. */
    await waitFor(() =>
      expect(storedLog().filter((e) => e.kind === 'condition-off')).toMatchObject([
        { who: 'Qwint', detail: 'Ready' },
        { who: 'Wolf', detail: 'Ready' },
      ]),
    );
    expect(stored().map((c) => c.conditions)).toEqual([[], [], []]);
  });

  it('keeps the turn, and leaves the clock alone, when nobody else can take it', async () => {
    seed([ally('af-e', 'Echo', 20, 'af-q'), combatant('af-o', 'Ogre', 10, { conditions: ['Dead'] })]);
    await renderFight();

    expect(whoseTurn()).toBe('Echo');
    /* Its ticks are a record of what it did, not the end of a turn. */
    endTurn('af-e');
    expect(whoseTurn()).toBe('Echo');
    expect(screen.getByText('Combat Round 1')).toBeInTheDocument();
    expect(memory.getItem('turnStartedAt')).toBe(EARLIER);
  });
});
