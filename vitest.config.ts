import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Avoid reading real `.svg` files during tests (CI/sandbox-safe `img` src stubs). */
function stubSvgImports() {
  return {
    name: 'stub-svg-imports',
    enforce: 'pre' as const,
    load(id: string) {
      if (/\.svg(\?|$)/.test(id)) {
        return `export default "data:image/svg+xml,%3Csvg/%3E";`;
      }
    },
  };
}

export default defineConfig({
  plugins: [stubSvgImports(), react()],
  test: {
    environment: 'node',
    setupFiles: ['./tests/setupTests.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environmentMatchGlobs: [['tests/**/*.rtl.test.ts', 'jsdom']],
  },
});
