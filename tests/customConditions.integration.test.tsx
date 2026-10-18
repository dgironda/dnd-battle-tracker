/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { Combatant } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import BattleTracker from '../src/components/BattleTracker/BattleTracker';
import { ConditionReminder } from '../src/components/BattleTracker/ConditionReminder';
import { track } from '../src/utils/telemetry';

vi.mock('../src/utils/telemetry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/telemetry')>()),
  track: vi.fn(),
}));

/**
 * Naming a condition from the picker: "New condition…" at the bottom of the
 * list turns the picker into a text box, and whatever is typed there goes on
 * as a condition of its own.
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

const ALDRIC = combatant('nc-a', 'Aldric', 20, []);
const BRANNOC = combatant('nc-b', 'Brannoc', 10, []);

let memory: ReturnType<typeof memoryStorage>;

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

const picker = (name: string) =>
  screen.getByRole('combobox', { name: `Add a condition to ${name}` }) as HTMLSelectElement;

/** Pick "New condition…" and get the box that takes the picker's place. */
function startNaming(name: string) {
  fireEvent.change(picker(name), { target: { value: ' new' } });
  return screen.getByRole('textbox', { name: `Name a new condition for ${name}` }) as HTMLInputElement;
}

function type(box: HTMLInputElement, text: string) {
  fireEvent.change(box, { target: { value: text } });
}

/** The picker's own made-up names, under its "Your conditions" heading. */
const yourConditions = (name: string) =>
  [...picker(name).querySelectorAll('optgroup[label="Your conditions"] option')].map((o) => o.textContent);

describe('naming a condition from the picker', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
    vi.mocked(track).mockClear();
    memory = memoryStorage();
    memory.setItem('storedCombatants', JSON.stringify([ALDRIC, BRANNOC]));
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

  it('ends the list with "New condition…", under the DM\'s own heading', async () => {
    renderTracker();
    await screen.findByRole('table');

    const options = [...picker('Aldric').options];
    expect(options[options.length - 1].textContent).toBe('New condition…');
    expect(options[options.length - 1].parentElement?.getAttribute('label')).toBe('Your conditions');
  });

  it('adds whatever is typed, as a word chip, and hands the keyboard back to the picker', async () => {
    renderTracker();
    await screen.findByRole('table');

    const box = startNaming('Aldric');
    expect(document.activeElement).toBe(box);

    type(box, 'slowed');
    fireEvent.keyDown(box, { key: 'Enter' });

    const chip = await screen.findByRole('button', { name: 'Remove Slowed' });
    /* Nothing is drawn for it, so the chip is the word. */
    expect(chip.querySelector('[data-condition]')).toBeNull();
    expect(chip.textContent).toContain('Slowed');

    expect(screen.queryByRole('textbox', { name: /Name a new condition/ })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(picker('Aldric')));
  });

  it('offers it to everyone else from then on', async () => {
    renderTracker();
    await screen.findByRole('table');

    const box = startNaming('Aldric');
    type(box, 'Slowed');
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByRole('button', { name: 'Remove Slowed' });

    expect(yourConditions('Brannoc')).toEqual(['Slowed', 'New condition…']);
    /* Not to the one who already has it. */
    expect(yourConditions('Aldric')).toEqual(['New condition…']);
    expect(JSON.parse(memory.getItem('customConditions')!)).toEqual(['Slowed']);

    /* And picking it from the list puts the same condition on. Brannoc's
       editor is the open one after that, and Aldric's cell is back at rest. */
    fireEvent.change(picker('Brannoc'), { target: { value: 'Slowed' } });
    await waitFor(() => expect(yourConditions('Brannoc')).toEqual(['New condition…']));
    expect(screen.getByRole('button', { name: 'Remove Slowed' })).toBeInTheDocument();
    expect(document.querySelector('.editConditions')?.textContent).toContain('Slowed');
  });

  it('gives you ours when you type one of ours', async () => {
    renderTracker();
    await screen.findByRole('table');

    const box = startNaming('Aldric');
    type(box, 'prone');
    fireEvent.keyDown(box, { key: 'Enter' });

    const chip = await screen.findByRole('button', { name: 'Remove Prone' });
    expect(chip.querySelector('[data-condition="Prone"]')).toBeTruthy();
    /* It is not a made-up one, so it is not remembered as one. */
    expect(memory.getItem('customConditions')).toBeNull();
  });

  it('lets the box go on Escape, or when it is left empty', async () => {
    renderTracker();
    await screen.findByRole('table');

    let box = startNaming('Aldric');
    type(box, 'Hasted');
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Remove Hasted' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(picker('Aldric')));

    box = startNaming('Aldric');
    fireEvent.blur(box);
    expect(screen.queryByRole('textbox', { name: /Name a new condition/ })).toBeNull();
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('aria-label')?.startsWith('Remove '))).toHaveLength(0);
  });

  it('still adds the name when the box loses focus with something in it', async () => {
    renderTracker();
    await screen.findByRole('table');

    const box = startNaming('Aldric');
    type(box, 'Hasted');
    act(() => picker('Brannoc').focus());

    expect(await screen.findByRole('button', { name: 'Remove Hasted' })).toBeInTheDocument();
    /* Once, however many ways the box was let go. */
    expect(vi.mocked(track).mock.calls.filter(([event]) => event === 'condition_applied')).toHaveLength(1);
  });

  it('reports a made-up one as "custom", never by the name that was typed', async () => {
    renderTracker();
    await screen.findByRole('table');

    const box = startNaming('Aldric');
    type(box, 'Hexed by Grandmother');
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByRole('button', { name: 'Remove Hexed by Grandmother' });

    fireEvent.change(picker('Brannoc'), { target: { value: 'Prone' } });
    await screen.findByRole('button', { name: 'Remove Prone' });

    const applied = vi.mocked(track).mock.calls.filter(([event]) => event === 'condition_applied');
    expect(applied.map(([, props]) => props)).toEqual([{ condition: 'custom' }, { condition: 'Prone' }]);
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain('Grandmother');
  });
});

describe('the turn reminder', () => {
  beforeEach(() => {
    memory = memoryStorage();
    memory.setItem('storedCombatants', '[]');
    memory.setItem('roundNumber', '1');
    vi.stubGlobal('localStorage', memory);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names a made-up condition without a colon pointing at nothing', () => {
    render(
      <GlobalProvider>
        <RosterProvider>
          <CombatProvider>
            <ConditionReminder
              combatant={combatant('nc-r', 'Rook', 5, ['Slowed', 'Prone'])}
              isOpen
              onClose={() => {}}
            />
          </CombatProvider>
        </RosterProvider>
      </GlobalProvider>,
    );

    const lines = [...document.querySelectorAll('#conditionReminderContent p')].map((p) => p.textContent);
    expect(lines[0]).toBe('Slowed');
    expect(lines[1]).toMatch(/^Prone: /);
  });
});
