import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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

afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});
