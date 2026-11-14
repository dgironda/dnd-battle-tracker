# BattleTracker status

Read at the start of a session; update before you finish. Newest first, one line each. Delete lines that stop being true.

## Release

- 0.6.4 (released 2026-11-12). Live: battletracker.simulacrumtechnologies.com.

## In flight

- 2026-11-14 · PR (damage at 0, with dmOS #8 and Sheets #10): a hit on a hero at 0 is a failed death save (two on a crit), in the HP window (new Crit toggle) and bridge `applyDamage` (new `crit` param, bridge v11), by the sheet's 5e rules in one place, `hitCombatant` (utils/damage.ts): massive damage on the drop (left over past 0 ≥ max HP) or at 0 kills; at 0, temp HP soaks first and only what gets through counts; a stable hero hit starts dying again (successes cleared). Every hit is kept as `Combatant.lastHit {amount, crit, at}`, which dmOS sends to the sheet. Tested (bridge and HP window). Left: HpChangeModal cognitive complexity 21 (warning).
- 2026-11-14 · branch `claude/project-thread-o996j0`: CLAUDE.md orientation, `docs/MAP.md`, this file, and blocked reads of the bestiaries. Not merged yet.

## Old branches

About 25 branches on GitHub were never merged and are a month or more old (`Analytics`, `BattleManager`, `DeathSaves`, `v.0.1` to `v.0.5.0`, and others). Ten more are already merged into `master`. Ignore them all unless the owner points you at one; cleaning them up is waiting on the owner's go-ahead.

## Known broken

- Nothing logged yet.
