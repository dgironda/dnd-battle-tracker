import { describe, it, expect } from "vitest";
import { toPlayerView, hpBand } from "../src/utils/playerView";
import { Combatant } from "../src/types/index";

const make = (over: Partial<Combatant> = {}): Combatant => ({
  id: "c1",
  name: "Someone",
  link: "https://5e.tools/secret",
  type: "monster",
  currHp: 10,
  maxHp: 10,
  tHp: 0,
  initiative: 10,
  init: 0,
  action: false,
  bonus: false,
  move: false,
  reaction: false,
  conditions: [],
  deathsaves: [],
  ac: 17,
  str: 18,
  dex: 14,
  con: 16,
  int: 12,
  wis: 13,
  cha: 11,
  pp: 12,
  notes: "knows where the McGuffin is",
  ...over,
});

describe("hpBand", () => {
  it("bands on the share of the maximum", () => {
    expect(hpBand(10, 10)).toBe("unharmed");
    expect(hpBand(9, 10)).toBe("hurt");
    expect(hpBand(6, 10)).toBe("hurt");
    expect(hpBand(5, 10)).toBe("bloodied");
    expect(hpBand(3, 10)).toBe("bloodied");
    expect(hpBand(2, 10)).toBe("critical");
    expect(hpBand(1, 10)).toBe("critical");
    expect(hpBand(0, 10)).toBe("down");
  });

  it("treats overkill as down rather than as a negative share", () => {
    expect(hpBand(-7, 10)).toBe("down");
  });

  it("does not divide by a zero maximum", () => {
    expect(hpBand(0, 0)).toBe("down");
    expect(hpBand(5, 0)).toBe("unharmed");
  });
});

describe("toPlayerView", () => {
  it("sends nothing but the public shape — no hp numbers, ac, stats, notes or links", () => {
    const view = toPlayerView([make({ currHp: 3, maxHp: 10 })], 1, null, 0);
    const [c] = view.combatants;

    expect(Object.keys(c).sort()).toEqual(
      ["conditions", "hp", "id", "initiative", "isCurrentTurn", "name", "type"].sort()
    );

    // and the whole payload, serialised, carries none of the private values
    const wire = JSON.stringify(view);
    expect(wire).not.toContain("5e.tools");
    expect(wire).not.toContain("McGuffin");
    expect(wire).not.toContain("17"); // ac
    expect(wire).not.toMatch(/"currHp"|"maxHp"|"tHp"|"deathsaves"/);
  });

  it("hides a monster carrying Invisible, and keeps it out of the order", () => {
    const view = toPlayerView(
      [
        make({ id: "seen", name: "Goblin", initiative: 12 }),
        make({ id: "lurker", name: "Ambusher", initiative: 20, conditions: ["Invisible"] }),
      ],
      2,
      null,
      0
    );

    expect(view.combatants.map((c) => c.id)).toEqual(["seen"]);
  });

  it("shows the monster again the moment the condition comes off", () => {
    const lurking = make({ id: "m", conditions: ["Invisible", "Prone"] });
    expect(toPlayerView([lurking], 1, null, 0).combatants).toHaveLength(0);

    const revealed = { ...lurking, conditions: ["Prone"] };
    const view = toPlayerView([revealed], 1, null, 0);
    expect(view.combatants).toHaveLength(1);
    expect(view.combatants[0].conditions).toEqual(["Prone"]);
  });

  it("keeps an invisible HERO — a party knows what it did to itself", () => {
    const view = toPlayerView(
      [make({ id: "h", type: "hero", conditions: ["Invisible"] })],
      1,
      null,
      0
    );
    expect(view.combatants).toHaveLength(1);
    expect(view.combatants[0].conditions).toEqual(["Invisible"]);
  });

  it("never leaks Invisible on a monster even if the filter above changed", () => {
    // conditions are filtered independently of the visibility rule, so the two
    // cannot drift into leaking the concealment itself
    const view = toPlayerView(
      [make({ id: "m", type: "monster", conditions: ["Poisoned"] })],
      1,
      null,
      0
    );
    expect(view.combatants[0].conditions).toEqual(["Poisoned"]);
  });

  it("orders by initiative, highest first", () => {
    const view = toPlayerView(
      [
        make({ id: "slow", initiative: 3 }),
        make({ id: "fast", initiative: 21 }),
        make({ id: "mid", initiative: 11 }),
      ],
      1,
      null,
      0
    );
    expect(view.combatants.map((c) => c.id)).toEqual(["fast", "mid", "slow"]);
  });

  it("marks whose turn it is by id, not by index", () => {
    // the DM's index points into THEIR list, which is longer whenever
    // something is hidden — so the id is the only thing that survives
    const view = toPlayerView(
      [
        make({ id: "lurker", initiative: 30, conditions: ["Invisible"] }),
        make({ id: "up-next", initiative: 20 }),
        make({ id: "later", initiative: 10 }),
      ],
      4,
      "up-next",
      0
    );

    expect(view.combatants.map((c) => c.isCurrentTurn)).toEqual([true, false]);
  });

  it("says nobody's turn when the active combatant is one the party cannot see", () => {
    const view = toPlayerView(
      [
        make({ id: "lurker", initiative: 30, conditions: ["Invisible"] }),
        make({ id: "seen", initiative: 10 }),
      ],
      1,
      "lurker",
      0
    );
    expect(view.combatants.every((c) => !c.isCurrentTurn)).toBe(true);
  });

  it("carries the round and a timestamp", () => {
    const view = toPlayerView([make()], 7, null, 1234);
    expect(view).toMatchObject({ v: 1, round: 7, updated: 1234 });
  });
});
