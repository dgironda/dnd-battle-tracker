/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalProvider } from '../src/hooks/optionsContext';
import PlayerLinkProvider from '../src/components/PlayerLinkProvider';
import App from '../src/App';
import { inDmos } from '../src/utils/dmos';

/* The Patreon check goes to the server; a supporter is what dmOS has. */
vi.mock('../src/hooks/useSupporter', () => ({
  useSupporter: () => ({
    isSupporter: true,
    gateAvailable: true,
    signedIn: true,
    inviteVisible: false,
    closeInvite: () => {},
    signOut: () => {},
  }),
}));

/**
 * BattleTracker in a dmOS window: dmOS has its own Hero Manager, Bestiary and
 * the rest, so the rail is down to the gear. Everywhere else, nothing changes.
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

function renderApp() {
  render(
    <GlobalProvider>
      <PlayerLinkProvider>
        <App />
      </PlayerLinkProvider>
    </GlobalProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

describe('knowing it is in dmOS', () => {
  it('is not, in a tab of its own', () => {
    expect(inDmos()).toBe(false);
  });

  it('is, when framed: only dmOS may frame BattleTracker', () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
    expect(inDmos()).toBe(true);
    vi.restoreAllMocks();
  });

  it('is, when asked to look like it, for trying the layout out', () => {
    window.history.replaceState({}, '', '/?host=dmos');
    expect(inDmos()).toBe(true);
  });
});

describe('the rail', () => {
  it('has everything, outside dmOS', () => {
    renderApp();

    expect(screen.getByAltText('BattleTracker')).toBeInTheDocument();
    for (const name of ['About and instructions', 'Hero Manager', 'Monster Manager', 'Battle Manager', 'Options']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/Thank you for your support/)).toBeInTheDocument();
  });

  it('is down to the gear in dmOS, which has its own managers', () => {
    window.history.replaceState({}, '', '/?host=dmos');
    renderApp();

    expect(screen.getByRole('button', { name: 'Options' })).toBeInTheDocument();
    expect(screen.queryByAltText('BattleTracker')).toBeNull();
    for (const name of ['About and instructions', 'Hero Manager', 'Monster Manager', 'Battle Manager']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByText(/Thank you for your support/)).toBeNull();
  });

  it('still opens a manager from its key in dmOS, so saving a battle stays in reach', async () => {
    window.history.replaceState({}, '', '/?host=dmos');
    renderApp();

    fireEvent.keyDown(window, { key: 'r' });

    expect(await screen.findByText(/Save Current Battle/i)).toBeInTheDocument();
  });
});
