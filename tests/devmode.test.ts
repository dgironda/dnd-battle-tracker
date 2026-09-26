import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Dev mode switches the Patreon gate off, so every visitor gets the supporter
 * perks. It must only ever be on under the dev server — never in a build,
 * whatever `.env` says, because `vite build` reads `.env` too.
 */

async function devmodeWith(env: { DEV: boolean; VITE_DEV_MODE: string }) {
  vi.stubEnv('DEV', env.DEV);
  vi.stubEnv('VITE_DEV_MODE', env.VITE_DEV_MODE);
  vi.resetModules();
  return (await import('../src/utils/devmode')).DEVMODE;
}

describe('devmode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is on under the dev server when .env asks for it', async () => {
    expect(await devmodeWith({ DEV: true, VITE_DEV_MODE: 'true' })).toBe(true);
  });

  it('is off under the dev server when .env does not', async () => {
    expect(await devmodeWith({ DEV: true, VITE_DEV_MODE: 'false' })).toBe(false);
  });

  it('is never on in a build, even with the flag left on', async () => {
    expect(await devmodeWith({ DEV: false, VITE_DEV_MODE: 'true' })).toBe(false);
  });
});
