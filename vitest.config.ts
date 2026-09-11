import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Avoid reading real `.svg` files during tests (CI/sandbox-safe `img` src stubs). */
function stubSvgImports() {
  return {
    name: 'stub-svg-imports',
    enforce: 'pre' as const,
    load(id: string) {
      if (/\.svg(\?|$)/.test(id)) {
        /* The file's own name rides along in the stub. Some tests care WHICH
           asset a component reached for — the paper picker shows fourteen
           different tiles — and one shared stub made them indistinguishable. */
        const name = id.split(/[\\/]/).pop()!.replace(/\?.*$/, "");
        return `export default ${JSON.stringify(`/stub/${name}`)};`;
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
