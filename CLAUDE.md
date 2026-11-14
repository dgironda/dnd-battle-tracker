# Before you start

1. Run `git pull --ff-only` before any work, so you start from the latest code. If it fails (local changes or a diverged branch), stop and tell the user in plain words; don't force anything.
2. Read `TESTING.md` before touching tests. Run `npm test` and `npm run fallow:changed` before you commit.
3. The messenger is **dmDM** (it used to be PIM). Say dmDM in docs and UI. Code, wire message types and saved keys still say `pim` on purpose; don't rename them.
4. dmOS's HANDBOOK.md is the full guide to how the three apps connect.

# Finding your way without reading everything

Read only what the task needs, in this order, and stop as soon as you know enough:

1. `docs/STATUS.md`: what's in flight, what's known broken, the last release. Update it before you finish (see below).
2. `docs/MAP.md`: one line per source file, from its header comment. Read the section for the folder you need, then open only those files. Many older files have no header yet; add one when you touch a file.
3. dmOS's `docs/CONNECTED.md`: the bridge methods dmOS calls here, generated from `src/bridge.ts`. Check it before changing the bridge.
4. dmOS's HANDBOOK.md Part 4 is BattleTracker; open a single Part, never the whole file.

Use `grep` before opening a file.

## Don't open

Big data files; search them with `grep` or `node -e` if you must, never read them whole:
`src/assets/2014monsters.json`, `src/assets/2024monsters.json`, `worker-configuration.d.ts`, `package-lock.json`, and the images in `SimTech/` and `src/assets/`.

## Commands

`npm run dev`, `npm test`, `npm run fallow:changed`, `npm run lint`, `npm run build`. `npm run release` cuts a release. `npm run map` rebuilds `docs/MAP.md`: run it when you add, move or re-describe a file, and commit the result with your change.

## Where things are

- `src/components/`: the notebook UI, by manager: `BattleManager/`, `BattleTracker/`, `HeroManager/`, `MonsterManager/`.
- `src/bridge.ts`: dmOS's door in (loaded via `bridge.html`). Bump its version when a method changes shape.
- `src/player/`: the players' view (`play.html`). `src/utils/`, `src/hooks/`, `src/constants/`, `src/types/`.
- `server/`, `workers/battle-rooms/`, `functions/`: Battle Link rooms and the Patreon API, separate from dmOS's campaign rooms.

## Before you finish

Add or update a line in `docs/STATUS.md` for what you did, what's left, and anything you found broken. Keep it short: it's read at the start of every session.
