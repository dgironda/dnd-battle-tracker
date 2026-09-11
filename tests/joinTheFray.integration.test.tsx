/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Combatant, Hero, Monster } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import HeroManager from '../src/components/HeroManager/HeroManager';
import MonsterManager from '../src/components/MonsterManager/MonsterManager';

/**
 * "Join the Fray" is only offered while there is a fight to join.
 *
 * Before a battle starts the button used to sit there looking perfectly
 * clickable. These pin down both halves: absent before a battle, present once
 * one is running. The "present" half is what keeps the "absent" half honest —
 * an assertion that a button is missing passes just as happily when the query
 * could never have found it, so each manager is also checked with a battle on,
 * where the same query has to succeed.
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

const HERO: Hero = {
  id: 'jf-hero',
  name: 'Gerwin',
  player: 'Dave',
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

const MONSTER: Monster = {
  id: 'jf-monster',
  name: 'Snaggletooth',
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
  init: 2,
  conditions: [],
  present: true,
};

function combatant(id: string, name: string): Combatant {
  return {
    id,
    name,
    link: '',
    type: 'monster',
    currHp: 20,
    maxHp: 20,
    tHp: 0,
    initiative: 12,
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

/** Somebody already fighting who is neither roster entry, so both still offer to join. */
const OGRE = combatant('jf-ogre', 'Ogre');

function seed(combatants: Combatant[]) {
  const memory = memoryStorage();
  memory.setItem('storedHeroes', JSON.stringify([HERO]));
  memory.setItem('storedMonsters', JSON.stringify([MONSTER]));
  memory.setItem('storedCombatants', JSON.stringify(combatants));
  memory.setItem('currentTurnIndex', '0');
  /* 0 is the app's own "no battle" round; a battle starts at 1. */
  memory.setItem('roundNumber', combatants.length > 0 ? '1' : '0');
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

const joinButtons = () => screen.queryAllByRole('button', { name: /join the fray/i });

describe('Join the Fray', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Hero Manager', () => {
    it('is not offered before a battle starts', async () => {
      seed([]);
      renderIn(<HeroManager onClose={() => {}} />);

      /* The row is there — its delete button proves it rendered — and only the
         join control is missing. */
      await screen.findByRole('button', { name: 'Delete Gerwin' });
      expect(joinButtons()).toHaveLength(0);
    });

    it('is offered once a battle is running', async () => {
      seed([OGRE]);
      renderIn(<HeroManager onClose={() => {}} />);

      await screen.findByRole('button', { name: 'Delete Gerwin' });
      expect(joinButtons()).toHaveLength(1);
    });

    it('still reads "In the Fray" for a hero who is already fighting', async () => {
      /* Existing behaviour, unchanged: once they are in, it says so rather than
         offering to add them twice. */
      seed([{ ...combatant(HERO.id, HERO.name), type: 'hero' }]);
      renderIn(<HeroManager onClose={() => {}} />);

      const inTheFray = await screen.findByRole('button', { name: /in the fray/i });
      expect(inTheFray).toBeDisabled();
      expect(joinButtons()).toHaveLength(0);
    });
  });

  describe('Monster Manager', () => {
    it('is not offered before a battle starts', async () => {
      seed([]);
      renderIn(<MonsterManager onClose={() => {}} />);

      await screen.findByRole('button', { name: 'Delete Snaggletooth' });
      expect(joinButtons()).toHaveLength(0);
    });

    it('is offered once a battle is running', async () => {
      seed([OGRE]);
      renderIn(<MonsterManager onClose={() => {}} />);

      await screen.findByRole('button', { name: 'Delete Snaggletooth' });
      expect(joinButtons()).toHaveLength(1);
    });
  });
});
