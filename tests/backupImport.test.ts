import { describe, it, expect } from "vitest";
import { importSummary, MAX_IMPORT_ENTRIES, planImport } from "../src/utils/backupImport";
import type { Combatant, Hero, Monster, SavedBattle } from "../src/types/index";

/**
 * Loading a backup file. The file is as often somebody else's as the DM's own,
 * so what it may change is decided here, before anything is written.
 */

const hero = (id: string, name = id) => ({ id, name }) as unknown as Hero;
const monster = (id: string) => ({ id, name: id }) as unknown as Monster;
const battle = (id: string) => ({ id, name: id }) as unknown as SavedBattle;
const combatant = (id: string) => ({ id, name: id }) as unknown as Combatant;

const nothingHere = { heroes: [], monsters: [], battles: [] };

const file = (over: Record<string, unknown> = {}) => ({
  heroes: [hero("h1")],
  monsters: [monster("m1")],
  battles: [battle("b1")],
  combatants: [],
  round: 0,
  currentTurnIndex: 0,
  ...over,
});

describe("planning an import", () => {
  it("refuses something that is not a backup at all", () => {
    for (const junk of [null, 42, "text", [], {}, { heroes: [] }]) {
      expect(planImport(junk, nothingHere)).toMatchObject({ ok: false, title: "Unrecognised file" });
    }
  });

  it("refuses lists that are not lists", () => {
    expect(planImport(file({ heroes: "Gerwin" }), nothingHere)).toMatchObject({ ok: false, title: "Invalid file" });
    expect(planImport(file({ battles: { b1: {} } }), nothingHere)).toMatchObject({ ok: false, title: "Invalid file" });
  });

  it("refuses a round that is not a real, non-negative number", () => {
    for (const round of [-1, Number.NaN, Number.POSITIVE_INFINITY, "3", null]) {
      expect(planImport(file({ round }), nothingHere)).toMatchObject({
        ok: false,
        message: "That file has an invalid round number.",
      });
    }
  });

  it("still loads a file from before monsters were exported", () => {
    const { monsters: _left, ...old } = file();
    void _left;
    expect(planImport(old, nothingHere)).toMatchObject({ ok: true, monsters: [] });
  });

  it("merges into what is here, giving a clashing id a fresh one", () => {
    const plan = planImport(file({ heroes: [hero("h1", "Their Gerwin"), hero("h2")] }), {
      heroes: [hero("h1", "My Gerwin")],
      monsters: [],
      battles: [],
    });
    if (!plan.ok) throw new Error("expected a plan");

    expect(plan.heroes.map((h) => h.name)).toEqual(["My Gerwin", "Their Gerwin", "h2"]);
    expect(plan.heroes[0].id).toBe("h1");
    expect(plan.heroes[1].id).not.toBe("h1");
    expect(plan.heroes[2].id).toBe("h2");
    expect(plan.added).toEqual({ heroes: 2, monsters: 1, battles: 1 });
  });

  it("refuses a file that would leave any list too long", () => {
    const many = Array.from({ length: MAX_IMPORT_ENTRIES }, (_, i) => hero(`f${i}`));
    expect(planImport(file({ heroes: many }), { ...nothingHere, heroes: [hero("mine")] })).toMatchObject({
      ok: false,
      title: "Too much data",
    });
  });

  it("keeps the file's turn inside its own battle", () => {
    const three = [combatant("c1"), combatant("c2"), combatant("c3")];
    const turnOf = (currentTurnIndex: unknown, combatants: Combatant[] = three) => {
      const plan = planImport(file({ combatants, round: 2, currentTurnIndex }), nothingHere);
      return plan.ok ? plan.turnIndex : null;
    };
    expect(turnOf(1)).toBe(1);
    expect(turnOf(9)).toBe(2);
    expect(turnOf(-4)).toBe(0);
    expect(turnOf("2")).toBe(0);
    expect(turnOf(5, [])).toBe(0);
  });
});

describe("the import summary", () => {
  const added = { heroes: 2, monsters: 3, battles: 1 };

  it("says what came in, and what happened to the file's battle", () => {
    expect(importSummary(added, "none")).toBe("Imported 2 heroes, 3 monsters and 1 saved battles.");
    expect(importSummary(added, "replaced")).toMatch(/now on the table\.$/);
    expect(importSummary(added, "kept")).toMatch(/left out; yours is untouched\.$/);
  });
});
