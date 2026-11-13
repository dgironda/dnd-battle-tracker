import { afterEach } from 'vitest';

/* Only the jsdom tests (the ones with a `@vitest-environment jsdom` docblock)
   render anything. Loading Testing Library into the plain node tests too cost
   every one of them its import time for nothing. */
const inDom = typeof document !== 'undefined';
if (inDom) {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => cleanup());
}

/* jsdom does not implement matchMedia, and the app assumes it does — App.tsx
   reads orientation from it, and the stat panels ask it whether the layout is
   the tap-driven one. Without this any component that asks throws on mount.

   Reports "no match", so components take their non-media default: in the stat
   panels' case, the hovering desktop behaviour. A test that needs the other
   branch can overwrite this. */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
