/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Hero, Monster } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import HeroManager from '../src/components/HeroManager/HeroManager';
import MonsterManager from '../src/components/MonsterManager/MonsterManager';

/**
 * The values in the hero and monster managers, now that they draw no pencil.
 *
 * An empty value used to be a button holding nothing but the pencil, so hiding
 * the pencil would have left nothing to click at all — and a hero with no
 * player is ordinary (AddHero allows it, and older saves normalise to ""). So
 * a blank is something you can see and click, and it still opens the field.
 *
 * HP and AC carry the heart and the shield, and they come AFTER the number:
 * icons go to the right of what they label. Which side is the kind of thing a
 * tidy-up flips without noticing, so it is pinned here.
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

function hero(id: string, name: string, player: string): Hero {
  return {
    id,
    name,
    player,
    hp: 123,
    tHp: 0,
    ac: 17,
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
    maxHp: 123,
    currHp: 123,
    link: '',
  };
}

function monster(id: string, name: string): Monster {
  return {
    id,
    name,
    link: '',
    hp: 546,
    maxHp: 546,
    currHp: 546,
    ac: 22,
    str: 30,
    dex: 10,
    con: 29,
    int: 18,
    wis: 15,
    cha: 23,
    pp: 26,
    init: 0,
    conditions: [],
    present: true,
  };
}

function seed(heroes: Hero[], monsters: Monster[]) {
  const memory = memoryStorage();
  memory.setItem('storedHeroes', JSON.stringify(heroes));
  memory.setItem('storedMonsters', JSON.stringify(monsters));
  memory.setItem('storedCombatants', '[]');
  memory.setItem('currentTurnIndex', '0');
  memory.setItem('roundNumber', '0');
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
}

function renderIn(ui: ReactNode) {
  return render(
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>{ui}</CombatProvider>
      </RosterProvider>
    </GlobalProvider>,
  );
}

/** The button a drawing sits in, and whether the value is written before it. */
function drawingAfterValue(file: string) {
  const drawing = document.querySelector(`img.valueIcon[src$="${file}"]`);
  expect(drawing, `no ${file} on the page`).not.toBeNull();
  const button = drawing!.closest('button')!;
  const [first, second] = [...button.childNodes];
  return {
    value: first.nodeType === Node.TEXT_NODE ? first.textContent : null,
    drawingIsNext: second === drawing,
  };
}

describe('manager values without the pencil', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Hero Manager', () => {
    it('shows a hero with no player as a blank you can still click to add one', async () => {
      seed([hero('mv-npc', 'Sister Garaele', '')], []);
      renderIn(<HeroManager onClose={() => {}} />);

      /* Scoped to the roster: the Add New Hero form above it has fields too. */
      const table = await screen.findByRole('table');
      fireEvent.click(within(table).getByRole('button', { name: 'No player' }));
      const field = within(table).getByRole('textbox');
      expect(field).toHaveValue('');

      fireEvent.change(field, { target: { value: 'Sam' } });
      fireEvent.blur(field);

      expect(await screen.findByRole('button', { name: 'Sam' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'No player' })).toBeNull();
    });

    it('shows a name cleared to nothing as "Unnamed", which opens the name', async () => {
      seed([hero('mv-blank', '', 'Sam')], []);
      renderIn(<HeroManager onClose={() => {}} />);

      const table = await screen.findByRole('table');
      fireEvent.click(within(table).getByRole('button', { name: 'Unnamed' }));
      expect(within(table).getByRole('textbox')).toHaveValue('');
    });

    it('puts the heart after the hit points and the shield after the armour class', async () => {
      seed([hero('mv-hero', 'Gerwin', 'Dave')], []);
      renderIn(<HeroManager onClose={() => {}} />);
      await screen.findByRole('button', { name: 'Delete Gerwin' });

      expect(drawingAfterValue('icon_hp.svg')).toEqual({ value: '123', drawingIsNext: true });
      expect(drawingAfterValue('icon_shield.svg')).toEqual({ value: '17', drawingIsNext: true });
    });

    it('clicking the heart edits the hit points', async () => {
      /* The drawing is inside the button rather than beside it, so it is part
         of what you can click. */
      seed([hero('mv-hero', 'Gerwin', 'Dave')], []);
      renderIn(<HeroManager onClose={() => {}} />);
      await screen.findByRole('button', { name: 'Delete Gerwin' });

      fireEvent.click(document.querySelector('img.valueIcon[src$="icon_hp.svg"]')!);
      expect(within(screen.getByRole('table')).getByRole('spinbutton')).toHaveValue(123);
    });
  });

  describe('Monster Manager', () => {
    it('shows a name cleared to nothing as "Unnamed", which opens the name', async () => {
      seed([], [monster('mv-mblank', '')]);
      renderIn(<MonsterManager onClose={() => {}} />);

      const table = await screen.findByRole('table');
      fireEvent.click(within(table).getByRole('button', { name: 'Unnamed' }));
      expect(within(table).getByRole('textbox')).toHaveValue('');
    });

    it('puts the heart after the hit points and the shield after the armour class', async () => {
      seed([], [monster('mv-dragon', 'Ancient Red Dragon')]);
      renderIn(<MonsterManager onClose={() => {}} />);
      await screen.findByRole('button', { name: 'Delete Ancient Red Dragon' });

      expect(drawingAfterValue('icon_hp.svg')).toEqual({ value: '546', drawingIsNext: true });
      expect(drawingAfterValue('icon_shield.svg')).toEqual({ value: '22', drawingIsNext: true });
    });
  });
});
