# Battle Tracker

## About

A free initiative and combat tracker for 5e that supports both the 2014 and 2024 rulesets. It includes hero and monster managers, an initiative tracker, condition reminders, and a guided tour to help new users get started.

## Quick Start

A typical first battle, mirroring the in-app tour:

1. Open the **Hero Manager** and **add a hero** — type a name and any other attributes, then press Enter or click **Add Hero**.
2. Open the **Monster Manager** and **add a monster** — type a creature name to look up an existing entry, or use a custom name. You can also enter a number to add multiples at once.
3. **Edit monster stats** as needed and **mark Ready for Next Battle** on any combatants you want included.
4. Save and close the Monster Manager to return to the Battle Tracker.
5. Press **Start Battle** and confirm the prompt.
6. **Roll for initiative** for each combatant — enter the rolled value plus modifier, or press **Roll** to auto-roll with the modifier from the Hero/Monster Manager.
7. **Run the battle** — check Action, Bonus, and Move for each combatant to advance turns. Apply conditions as needed, hover a combatant to view their stat block (click to pin it), and access notes and monster source links from there.

## Instructions

- Add your party's heroes in the **Hero Manager** and monsters in the **Monster Manager**.
- Choose the 5e rules (2014 / 2024) using the rules version button in **Options**. This affects concentration checks, condition definitions, and which monsters appear in the Monster Manager dropdown.
- In **Options** you can also toggle turn condition reminders, the time display, and reset the tour.
- Only heroes and monsters **checked Ready For Next Battle** are added when a battle starts.
- Monsters are **removed from the Monster Manager** when added to a battle.
- Turn automatically advances when the current combatant's **Action**, **Bonus**, and **Movement** are all checked.
- Hover over conditions for a reminder of their effects; hover over any combatant to see their stats.
- During battle, **Concentration** and **Death Saving Throw** reminders pop up when the relevant status is marked.
- **Patreon members** can use the **Battle Manager** to save battles and export/import all data.

## Keyboard Shortcuts

- **A** — check/uncheck current player's **Action**
- **S** — check/uncheck current player's **Bonus**
- **D** — check/uncheck current player's **Movement**
- **E** — open/close **Hero Manager**
- **W** — open/close **Monster Manager**
- **R** — open/close **Battle Manager**
- **X** — close combatant hover stat box

## Releasing

The About panel shows the version from `package.json` and the commit it was built from, so every release needs a new version. One command does it all:

- `npm run release -- patch` for fixes (0.4.1 → 0.4.2)
- `npm run release -- minor` for new features (0.4.2 → 0.5.0)
- `npm run release -- major` for the big one (1.0.0)

First it shows the version it will make (0.4.1 → 0.5.0 for a minor, say) and waits for a yes. Then it runs lint and the tests, raises the version, commits it as "Release x.y.z" and deploys to production. It doesn't push. Commit your work first; it won't run with uncommitted changes.

A plain `npm run deploy` checks first (`tools/check-release.mjs`). It refuses uncommitted changes, and it refuses a version that's already live with different code. Set `SKIP_RELEASE_CHECK=1` to skip the check, for a preview deploy say. A build made with uncommitted changes shows `-dirty` after its build ID.

## Credits

- **Created by:** DM Dave
- **Additional coding by:** [Jason Peterson](https://madmilliner.github.io/jasonPeterson/)
- **Art by:** [Aether Ilo - Emily](https://bio.site/aetherillo)
- **QA Testers:** Danny Cullen, Jayme Andrews, Zach Dender, Morrison Keddie
- **Special Thanks:** Wolf Harrington

## Legal

Battle Tracker is independent and isn't affiliated with or endorsed by Wizards of the Coast. It includes material from the [System Reference Document 5.1](https://dnd.wizards.com/resources/systems-reference-document) and [System Reference Document 5.2](https://www.dndbeyond.com/srd) by Wizards of the Coast LLC, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
