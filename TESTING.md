# Testing BattleTracker

Read this instead of rediscovering the setup.

## Run

```bash
npm test                     # vitest run   (~18 s, 59 files, ~490 tests)
npx vitest run tests/initiative.test.ts
npm run lint
npm run fallow               # dead code, dupes, complexity vs the two fallow-*-baseline.json files
npm run fallow:changed       # fallow audit: only files changed since the base branch
```

`npm test` does not typecheck. Run `npx tsc -b` too when you change types.

## Layout and environments

- Everything lives in `tests/`, flat. `*.integration.test.tsx` render the app with Testing Library; `*.test.ts` are pure helpers in node.
- Default environment is **node**. A test that renders opts in with a docblock on line 1: `// @vitest-environment jsdom`. There is no filename rule; `environmentMatchGlobs` was removed (Vitest 4 dropped it).
- `tests/setupTests.ts` stubs `matchMedia` and loads jest-dom and Testing Library's `cleanup` **only in jsdom tests**, so node tests stay fast.
- SVG imports are stubbed to `/stub/<filename>.svg` by `vitest.config.ts`, so a test can check which asset was used.

## Where the time goes

jsdom startup is most of the run (about 20 s of environment time spread over workers). The slowest files are all integration renders: `turnShift` 1.8 s, `customConditions` 1.3 s, `allyTurnFlow` 1.1 s, `initiativeTable` 1.0 s. Prefer a pure helper test over a new jsdom render when the logic can be pulled out.

## Conventions

- Expected stderr: `localStorage` corrupt-JSON tests, `roomFunction` missing binding and `patreonSession` wrong-campaign log on purpose. Not failures.
- When connected to dmOS, the bridge contract has its own version (`BRIDGE_VERSION`); bump it and its test together (dmOS HANDBOOK).
- The messenger in dmOS and Sheets is **dmDM** (formerly PIM).
- Made-up characters only.

## Known state (2026-11-13)

- fallow dead code: clean. Health (25 findings) and dupes (8 groups) baselines saved 2026-11-13, so `npm run fallow` fails only on new growth. Run `npm run fallow:changed` whenever BattleTracker code changed.
