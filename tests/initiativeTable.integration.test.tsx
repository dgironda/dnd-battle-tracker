/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Hero, Monster } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import BattleTracker from '../src/components/BattleTracker/BattleTracker';
import OptionsPanel from '../src/components/OptionsPanel';

/**
 * Manual mode: everyone's initiative in one table.
 *
 * The one-at-a-time prompt cannot move on until it has an answer, so a player
 * away from the table held up the start of the whole fight. These play the
 * table the way a DM does: totals typed as they are called out, out of order,
 * with somebody missing.
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

function hero(id: string, name: string, init: number, player = ''): Hero {
  return {
    id,
    name,
    player,
    hp: 20,
    tHp: 0,
    ac: 14,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
    init,
    conditions: [],
    present: true,
    maxHp: 20,
    currHp: 20,
    link: '',
  };
}

function monster(id: string, name: string, init: number): Monster {
  return {
    id,
    name,
    link: '',
    hp: 7,
    maxHp: 7,
    currHp: 7,
    ac: 15,
    str: 8,
    dex: 14,
    con: 10,
    int: 10,
    wis: 8,
    cha: 8,
    pp: 9,
    init,
    present: true,
    conditions: [],
  };
}

const HEROES = [hero('h-ara', 'Ara', 3, 'Jayme'), hero('h-bo', 'Bo', 1), hero('h-cy', 'Cy', 0)];
const MONSTERS = [
  monster('m-g1', 'Goblin 1', 2),
  monster('m-g2', 'Goblin 2', 2),
  monster('m-ogre', 'Ogre', -1),
];

let memory: ReturnType<typeof memoryStorage>;

function seed(manualInitiative: boolean) {
  memory = memoryStorage();
  memory.setItem('storedHeroes', JSON.stringify(HEROES));
  memory.setItem('storedMonsters', JSON.stringify(MONSTERS));
  memory.setItem('storedCombatants', '[]');
  memory.setItem('currentTurnIndex', '0');
  memory.setItem('roundNumber', '0');
  memory.setItem(
    'appSettings',
    JSON.stringify({
      version: 'twentyFourteen',
      theme: 'light',
      /* Off, so a reminder cannot open over the tracker once it starts. */
      conditionReminderOn: false,
      currentTurnTime: true,
      tourReady: false,
      manualInitiative,
    }),
  );
  vi.stubGlobal('localStorage', memory);
}

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

async function openTable() {
  renderTracker();
  fireEvent.click(screen.getByRole('button', { name: 'Start the battle' }));
  return screen.findByRole('dialog', { name: 'Roll for Initiative' });
}

const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.change(box(label), { target: { value } });
const enter = (label: string) => fireEvent.keyDown(box(label), { key: 'Enter' });

/** The tracker's rows, top to bottom, as name and initiative. */
const trackerRows = () =>
  [...document.querySelectorAll('#battleTracker tbody tr')]
    .filter((row) => row.querySelector('.combatantNameText'))
    .map((row) => {
      const init = row.querySelector('td.combatantInit')?.textContent ?? '';
      return `${row.querySelector('.combatantNameText')?.textContent} ${/-?\d+/.exec(init)?.[0]}`;
    });

describe('the initiative table', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
    seed(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lists everyone, takes totals in any order, and rolls for whoever is left blank', async () => {
    const table = await openTable();

    expect(table).toHaveTextContent('Ara');
    expect(table).toHaveTextContent('Jayme');
    expect(table).toHaveTextContent('Ogre');

    /* Called out of order, with Bo away from the table. */
    type('Initiative for Cy', '12');
    type('Initiative for Ara', '18');
    type('Initiative for every Goblin', '9');
    type('Initiative for Ogre', '5');
    expect(table).toHaveTextContent('1 still blank');

    /* d20 of 11, plus Bo's +1. */
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(screen.getByRole('button', { name: 'Start Battle' }));

    await waitFor(() => expect(document.querySelector('#battleTracker')).not.toBeNull());
    expect(screen.queryByRole('dialog', { name: 'Roll for Initiative' })).toBeNull();
    /* Bo and Cy tie on 12 and stay in roster order. */
    expect(trackerRows()).toEqual(['Ara 18', 'Bo 12', 'Cy 12', 'Goblin 1 9', 'Goblin 2 9', 'Ogre 5']);
  });

  it('rolls the rest without touching a total already typed', async () => {
    await openTable();
    type('Initiative for Ara', '15');

    /* A natural 1 for everyone still blank. */
    vi.spyOn(Math, 'random').mockReturnValue(0);
    fireEvent.click(screen.getByRole('button', { name: /Roll the Rest/ }));

    expect(box('Initiative for Ara').value).toBe('15');
    expect(box('Initiative for Bo').value).toBe('2');
    expect(box('Initiative for Cy').value).toBe('1');
    expect(box('Initiative for Goblin 1').value).toBe('3');
    expect(box('Initiative for Ogre').value).toBe('0');
    expect(screen.getByText('Everyone has a total.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Roll the Rest/ })).toBeDisabled();
  });

  it("gives a group's total to every monster of that kind, and still lets one differ", async () => {
    await openTable();

    type('Initiative for every Goblin', '14');
    expect(box('Initiative for Goblin 1').value).toBe('14');
    expect(box('Initiative for Goblin 2').value).toBe('14');

    type('Initiative for Goblin 2', '7');
    expect(box('Initiative for every Goblin').value).toBe('');
    expect(box('Initiative for every Goblin').placeholder).toBe('mixed');
  });

  it('moves Enter to the next blank box, past whoever is away, and then to Start Battle', async () => {
    await openTable();
    expect(document.activeElement).toBe(box('Initiative for Ara'));

    type('Initiative for Ara', '10');
    enter('Initiative for Ara');
    expect(document.activeElement).toBe(box('Initiative for Bo'));

    /* Bo is away: Enter steps past him. */
    enter('Initiative for Bo');
    expect(document.activeElement).toBe(box('Initiative for Cy'));

    type('Initiative for Cy', '8');
    type('Initiative for every Goblin', '9');
    type('Initiative for Ogre', '4');

    /* From the last box, round to the one still blank... */
    enter('Initiative for Ogre');
    expect(document.activeElement).toBe(box('Initiative for Bo'));

    /* ...and from there, with nothing else to fill, to the button. */
    enter('Initiative for Bo');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Start Battle' }));
  });

  it('cancels without starting anything, and the monsters stay in the manager', async () => {
    await openTable();
    type('Initiative for Ara', '18');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel battle' }));

    expect(screen.queryByRole('dialog', { name: 'Roll for Initiative' })).toBeNull();
    expect(document.querySelector('#battleTracker')).toBeNull();
    expect(JSON.parse(memory.getItem('storedMonsters')!)).toHaveLength(3);
  });

  it('backs out on Escape, as the single prompt does', async () => {
    await openTable();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Roll for Initiative' })).toBeNull();
    expect(document.querySelector('#battleTracker')).toBeNull();
  });
});

describe('with manual initiative off', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
    seed(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks one combatant at a time, as before', async () => {
    renderTracker();
    fireEvent.click(screen.getByRole('button', { name: 'Start the battle' }));

    expect(await screen.findByRole('dialog', { name: 'Initiative for Ara' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Roll for Initiative' })).toBeNull();
  });
});

describe('the Options switch', () => {
  beforeEach(() => seed(true));
  afterEach(() => vi.unstubAllGlobals());

  it('turns manual initiative off and remembers it', async () => {
    render(
      <GlobalProvider>
        <OptionsPanel onClose={() => {}} isSupporter={true} onLockedPick={() => {}} />
      </GlobalProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manual Initiative: On' }));

    expect(screen.getByRole('button', { name: 'Manual Initiative: Off' })).toBeInTheDocument();
    await waitFor(() =>
      expect(JSON.parse(memory.getItem('appSettings')!).manualInitiative).toBe(false),
    );
  });
});
