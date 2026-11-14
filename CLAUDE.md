# Before you start

1. Run `git pull --ff-only` before any work, so you start from the latest code. If it fails (local changes or a diverged branch), stop and tell the user in plain words; don't force anything.
2. Read `TESTING.md` before touching tests. Run `npm test` and `npm run fallow:changed` before you commit.
3. The messenger is **dmDM** (it used to be PIM). Say dmDM in docs and UI. Code, wire message types and saved keys still say `pim` on purpose; don't rename them.
4. dmOS's HANDBOOK.md is the full guide to how the three apps connect.
