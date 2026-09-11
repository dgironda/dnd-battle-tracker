/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Combatant } from '../src/types/index';
import { GlobalProvider } from '../src/hooks/optionsContext';
import { CombatProvider } from '../src/components/BattleTracker/CombatContext';
import { RosterProvider } from '../src/hooks/rosterContext';
import BattleManager from '../src/components/BattleManager/BattleManager';

/**
 * Reference photos on a battle that is already saved.
 *
 * Attaching one was only possible in the save form, and that form is only on
 * screen while a fight is running — so a saved battle could never gain a
 * photo afterwards, and one attached by mistake could not be taken off without
 * deleting the battle. These cover the three things a card and its viewer now
 * do, and the one thing the viewer must NOT do: the card behind it is itself a
 * click target, and a portal's clicks still travel up the React tree.
 */

/* jsdom has no IndexedDB. The store is the only piece stood in for — the
   panel's reads and writes go through it exactly as they do in a browser. */
const photos = vi.hoisted(() => new Map<string, { full: Blob; thumb: Blob }>());

vi.mock('../src/utils/photoStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/photoStore')>();
  return {
    ...actual,
    putPhoto: vi.fn(async (id: string, photo: { full: Blob; thumb: Blob }) => {
      photos.set(id, photo);
      return id;
    }),
    getPhoto: vi.fn(async (id: string) => photos.get(id) ?? null),
    deletePhoto: vi.fn(async (id: string) => void photos.delete(id)),
    listPhotoIds: vi.fn(async () => [...photos.keys()]),
    pruneOrphans: vi.fn(async () => 0),
  };
});

/* Canvas is not implemented in jsdom either, so compression is stood in for as
   well. What is being tested is what the panel does with the result. */
vi.mock('../src/utils/imageCompression', () => ({
  compressImageForUpload: vi.fn(async () => ({
    thumbnail: 'data:image/jpeg;base64,dGh1bWI=',
    fullScreen: 'data:image/jpeg;base64,ZnVsbA==',
    originalWidth: 1280,
    originalHeight: 720,
  })),
}));

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

function combatant(id: string, name: string, type: 'hero' | 'monster'): Combatant {
  return {
    id,
    name,
    link: '',
    type,
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

const PLAIN = {
  id: 'b-plain',
  name: 'Goblin Ambush',
  savedDate: '2026-09-10T18:00:00.000Z',
  combatants: [combatant('c1', 'Gerwin', 'hero'), combatant('c2', 'Goblin 1', 'monster')],
  roundNumber: 2,
  currentTurnIndex: 0,
};

const WITH_PHOTO = {
  id: 'b-photo',
  name: 'Dragon Cave',
  savedDate: '2026-09-11T18:00:00.000Z',
  combatants: [combatant('c3', 'Gerwin', 'hero')],
  roundNumber: 5,
  currentTurnIndex: 0,
  photoId: 'old-photo',
};

const blobOf = (text: string) => new Blob([text], { type: 'image/jpeg' });
const imageFile = (name: string) => new File(['bytes'], name, { type: 'image/jpeg' });

/** Choose a file in an input, the way a person picking one would. */
function pick(input: HTMLElement, file: File) {
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  fireEvent.change(input);
}

const readBattles = () =>
  JSON.parse(localStorage.getItem('savedBattles') ?? '[]') as (typeof WITH_PHOTO)[];

const battle = (id: string) => readBattles().find((b) => b.id === id);

const picker = () => screen.getByLabelText('Choose a photo for a saved battle');

const selectedCards = () => document.querySelectorAll('.battle-card.selected');

function renderManager(onClose: () => void = () => {}) {
  return render(
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>
          <BattleManager onClose={onClose} />
        </CombatProvider>
      </RosterProvider>
    </GlobalProvider>,
  );
}

describe('photos on a saved battle', () => {
  let urls = 0;

  beforeEach(() => {
    photos.clear();
    photos.set('old-photo', { full: blobOf('old-full'), thumb: blobOf('old-thumb') });

    const memory = memoryStorage();
    memory.setItem('savedBattles', JSON.stringify([PLAIN, WITH_PHOTO]));
    memory.setItem('storedHeroes', '[]');
    memory.setItem('storedMonsters', '[]');
    memory.setItem('storedCombatants', '[]');
    memory.setItem('roundNumber', '0');
    memory.setItem('currentTurnIndex', '0');
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
    vi.stubGlobal('alert', vi.fn());
    /* No DialogHost is mounted, so confirmDialog falls back to this. Saying
       yes is what makes the removal path reachable. */
    vi.stubGlobal('confirm', vi.fn(() => true));

    /* jsdom implements neither of these, and every photo shown mints one. */
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => `blob:photo-${++urls}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });

    /* The panel mints a key for each photo it stores. Deterministic here, so
       "not the key it had before" is a real assertion rather than a coin toss. */
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => `photo-key-${++urls}`,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers a photo on a battle that has none, and keeps the one you pick', async () => {
    renderManager();

    const add = await screen.findByRole('button', { name: 'Add a photo to Goblin Ambush' });
    fireEvent.click(add);
    pick(picker(), imageFile('map.jpg'));

    /* The card shows it, which is the part a DM actually sees. */
    await screen.findByAltText('Reference photo for Goblin Ambush');

    const saved = battle('b-plain')!;
    expect(saved.photoId).toBeTruthy();
    expect(photos.has(saved.photoId!)).toBe(true);

    /* And the invitation is gone, because the card has a photo now. */
    expect(screen.queryByRole('button', { name: 'Add a photo to Goblin Ambush' })).toBeNull();
  });

  it('changes a photo from the viewer, and does not leave the old one behind', async () => {
    renderManager();

    fireEvent.click(
      await screen.findByRole('button', { name: 'View the reference photo for Dragon Cave' }),
    );

    const viewer = await screen.findByRole('dialog', { name: 'Reference photo for Dragon Cave' });
    fireEvent.click(within(viewer).getByRole('button', { name: 'Change photo' }));
    pick(picker(), imageFile('cave.jpg'));

    await waitFor(() => expect(battle('b-photo')!.photoId).not.toBe('old-photo'));
    expect(battle('b-photo')!.photoId).toBeTruthy();
    /* Swapping a photo must not quietly fill the store with orphans. */
    expect(photos.has('old-photo')).toBe(false);
    expect(photos.size).toBe(1);
  });

  it('removes a photo, leaving the battle itself alone', async () => {
    renderManager();

    fireEvent.click(
      await screen.findByRole('button', { name: 'View the reference photo for Dragon Cave' }),
    );
    const viewer = await screen.findByRole('dialog', { name: 'Reference photo for Dragon Cave' });
    fireEvent.click(within(viewer).getByRole('button', { name: 'Remove photo' }));

    await waitFor(() => expect(battle('b-photo')!.photoId).toBeUndefined());
    expect(photos.has('old-photo')).toBe(false);

    /* The battle is still there, with everything else it had. */
    const saved = battle('b-photo')!;
    expect(saved.name).toBe('Dragon Cave');
    expect(saved.combatants).toHaveLength(1);
    expect(saved.roundNumber).toBe(5);

    /* The photo is gone from the card, and it offers to take another. */
    expect(screen.queryByAltText('Reference photo for Dragon Cave')).toBeNull();
    expect(
      await screen.findByRole('button', { name: 'Add a photo to Dragon Cave' }),
    ).toBeInTheDocument();
  });

  it('opens and closes over the card without opening the card', async () => {
    /* The viewer is portalled to <body>, but React sends its events up the
       component tree — so every click inside it used to reach the card it was
       rendered from and toggle the battle's roster open behind it. */
    renderManager();

    fireEvent.click(
      await screen.findByRole('button', { name: 'View the reference photo for Dragon Cave' }),
    );
    await screen.findByRole('dialog', { name: 'Reference photo for Dragon Cave' });
    expect(selectedCards()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close the photo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(selectedCards()).toHaveLength(0);
  });

  it('closes on Escape without the app seeing it', async () => {
    /* Escape closes the whole Battle Manager, so the viewer has to catch its
       own on the way down or looking at a photo would shut the panel. */
    renderManager();

    fireEvent.click(
      await screen.findByRole('button', { name: 'View the reference photo for Dragon Cave' }),
    );
    await screen.findByRole('dialog', { name: 'Reference photo for Dragon Cave' });

    const appEscape = vi.fn();
    window.addEventListener('keydown', appEscape);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    window.removeEventListener('keydown', appEscape);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(appEscape).not.toHaveBeenCalled();
  });
});
