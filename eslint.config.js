import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', 'worker-configuration.d.ts', '*.tsbuildinfo']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Context modules deliberately export a provider component alongside the
    // hooks and helpers that read it — the standard React context shape. The
    // fast-refresh rule can't model that, and splitting them apart to satisfy
    // it would make the code worse, so it's off for these files only.
    files: [
      'src/hooks/rosterContext.tsx',
      'src/hooks/optionsContext.tsx',
      'src/components/BattleTracker/CombatContext.tsx',
      'src/utils/notify.tsx',
      'src/utils/Utils.tsx',
      'src/components/Tour.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Tests run under vitest globals and aren't part of the app bundle.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
