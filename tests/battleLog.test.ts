import { describe as suite, it, expect } from "vitest";
import {
  makeEntry,
  appendEntry,
  describe as line,
  groupByRound,
  LOG_LIMIT,
  type LogEntry,
} from "../src/utils/battleLog";

const at = 1_700_000_000_000;

suite("appendEntry", () => {
  it("keeps entries in the order they happened", () => {
    const a = makeEntry("damage", "Gerwin", 1, { amount: 5 }, at);
    const b = makeEntry("heal", "Gerwin", 1, { amount: 2 }, at + 10);

    const log = appendEntry(appendEntry([], a), b);
    expect(log.map((e) => e.kind)).toEqual(["damage", "heal"]);
  });

  it("drops the oldest once the cap is reached, never the newest", () => {
    let log: LogEntry[] = [];
    for (let i = 0; i < LOG_LIMIT + 20; i++) {
      log = appendEntry(log, makeEntry("damage", `hit ${i}`, 1, { amount: i }, at + i));
    }

    expect(log).toHaveLength(LOG_LIMIT);
    expect(log[log.length - 1].who).toBe(`hit ${LOG_LIMIT + 19}`);
    expect(log[0].who).toBe("hit 20");
  });

  it("gives every entry a distinct id even within the same millisecond", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => makeEntry("damage", "x", 1, {}, at).id)
    );
    expect(ids.size).toBe(50);
  });
});

suite("describe", () => {
  it("reads the way a DM says it out loud", () => {
    expect(line(makeEntry("damage", "Gerwin", 3, { amount: 12, from: 22, to: 10 }, at)))
      .toBe("Gerwin took 12, 22 to 10");
    expect(line(makeEntry("heal", "Gerwin", 3, { amount: 5, from: 10, to: 15 }, at)))
      .toBe("Gerwin healed 5, 10 to 15");
  });

  it("leaves the hit points out when they were not part of it", () => {
    expect(line(makeEntry("damage", "Goblin", 1, { amount: 4 }, at)))
      .toBe("Goblin took 4");
  });

  it("says what happened for every other kind", () => {
    expect(line(makeEntry("condition-on", "Ogre", 2, { detail: "Prone" }, at)))
      .toBe("Ogre is Prone");
    expect(line(makeEntry("condition-off", "Ogre", 2, { detail: "Prone" }, at)))
      .toBe("Ogre is no longer Prone");
    expect(line(makeEntry("temp-hp", "Gerwin", 2, { amount: 8 }, at)))
      .toBe("Gerwin gained 8 temporary hit points");
    expect(line(makeEntry("temp-hp", "Gerwin", 2, { amount: 0 }, at)))
      .toBe("Gerwin lost their temporary hit points");
    expect(line(makeEntry("down", "Gerwin", 4, {}, at))).toBe("Gerwin went down");
    expect(line(makeEntry("revived", "Gerwin", 5, {}, at))).toBe("Gerwin is back up");
    expect(line(makeEntry("joined", "Wolf", 2, {}, at))).toBe("Wolf joined the battle");
    expect(line(makeEntry("left", "Wolf", 6, {}, at))).toBe("Wolf left the battle");
  });

  it("keeps the name it was given, so a later rename does not rewrite history", () => {
    const entry = makeEntry("damage", "Goblin 2", 1, { amount: 3 }, at);
    expect(line(entry)).toContain("Goblin 2");
  });
});

suite("groupByRound", () => {
  const log: LogEntry[] = [
    makeEntry("round", "", 1, {}, at),
    makeEntry("damage", "Goblin", 1, { amount: 3 }, at + 1),
    makeEntry("damage", "Gerwin", 1, { amount: 4 }, at + 2),
    makeEntry("round", "", 2, {}, at + 3),
    makeEntry("heal", "Gerwin", 2, { amount: 6 }, at + 4),
  ];

  it("puts the newest round first", () => {
    expect(groupByRound(log).map((g) => g.round)).toEqual([2, 1]);
  });

  it("keeps what happened inside a round in the order it happened", () => {
    const roundOne = groupByRound(log).find((g) => g.round === 1)!;
    expect(roundOne.entries.map((e) => e.who)).toEqual(["Goblin", "Gerwin"]);
  });

  it("turns the round markers into headings rather than listing them", () => {
    const all = groupByRound(log).flatMap((g) => g.entries);
    expect(all.some((e) => e.kind === "round")).toBe(false);
  });

  it("still shows a round in which nothing happened", () => {
    const quiet = [makeEntry("round", "", 7, {}, at)];
    expect(groupByRound(quiet)).toEqual([{ round: 7, entries: [] }]);
  });

  it("handles an empty log", () => {
    expect(groupByRound([])).toEqual([]);
  });
});
