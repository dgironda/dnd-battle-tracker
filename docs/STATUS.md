# BattleTracker status

Read at the start of a session; update before you finish. Newest first, one line each. Delete lines that stop being true.

## Release

- 0.6.4 (released 2026-11-12). Live: battletracker.simulacrumtechnologies.com.

## In flight

- 2026-11-14 · branch `claude/damage-at-zero`: a hit on a hero at 0 is a failed death save (two on a crit, dead at max HP or more), in the HP window (new Crit toggle) and bridge `applyDamage` (new `crit` param, bridge v11). Every hit is kept as `Combatant.lastHit {amount, crit, at}` so dmOS can send it as the vitals `hit` (dmOS #8). **Left:** dmOS must read `lastHit` in campaignLink's reconcile and send `hit` when `at` is new (a hit at 0 changes no HP, so today nothing goes out); dmOS's CONNECTED.md needs regenerating; `tests/campaignData.test.ts` still expects bridge v10 (test thread). Now on `claude/project-thread-yuyijr`, matching the sheet's 5e rules: massive damage on the drop (left over past 0 ≥ max HP) kills; at 0, temp HP soaks first and only what gets through fails a save; a stable hero hit starts dying again (successes cleared). One rule for both paths: `hitCombatant`.
- 2026-11-14 · branch `claude/project-thread-o996j0`: CLAUDE.md orientation, `docs/MAP.md`, this file, and blocked reads of the bestiaries. Not merged yet.

## Old branches

About 25 branches on GitHub were never merged and are a month or more old (`Analytics`, `BattleManager`, `DeathSaves`, `v.0.1` to `v.0.5.0`, and others). Ten more are already merged into `master`. Ignore them all unless the owner points you at one; cleaning them up is waiting on the owner's go-ahead.

## Known broken

- Nothing logged yet.
