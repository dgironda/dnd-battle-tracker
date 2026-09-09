/** @vitest-environment jsdom */
import { describe as suite, it, expect, beforeEach } from "vitest";
import {
  clearCrashCount,
  clearCurrentFight,
  isCrashLoop,
  LOOP_THRESHOLD,
  noteCrash,
  readCrashCount,
} from "../src/utils/crashRecovery";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

suite("counting crashes", () => {
  it("counts up, and forgets when the app comes back", () => {
    expect(readCrashCount()).toBe(0);
    expect(noteCrash()).toBe(1);
    expect(noteCrash()).toBe(2);
    expect(readCrashCount()).toBe(2);

    clearCrashCount();
    expect(readCrashCount()).toBe(0);
  });

  it("only calls it a loop once reloading has plainly stopped helping", () => {
    for (let i = 0; i < LOOP_THRESHOLD; i++) {
      expect(isCrashLoop(noteCrash())).toBe(false);
    }
    expect(isCrashLoop(noteCrash())).toBe(true);
  });

  it("ignores a junk count rather than throwing on the way up", () => {
    sessionStorage.setItem("crashCount", "not a number");
    expect(readCrashCount()).toBe(0);
  });
});

suite("clearCurrentFight", () => {
  const fight = {
    storedCombatants: '[{"name":"Gerwin"}]',
    roundNumber: "3",
    currentTurnIndex: "1",
    turnStartedAt: "1700000000000",
    battleLog: "[]",
  };
  const keep = {
    storedHeroes: '[{"name":"Gerwin"}]',
    storedMonsters: '[{"name":"Goblin"}]',
    savedBattles: '[{"name":"Session 4"}]',
    appSettings: '{"theme":"dark"}',
  };

  it("clears the fight in progress", () => {
    Object.entries(fight).forEach(([k, v]) => localStorage.setItem(k, v));
    const removed = clearCurrentFight();

    expect(removed.sort()).toEqual(Object.keys(fight).sort());
    Object.keys(fight).forEach((k) => expect(localStorage.getItem(k)).toBeNull());
  });

  it("leaves everything a person spent evenings on exactly where it was", () => {
    Object.entries({ ...fight, ...keep }).forEach(([k, v]) => localStorage.setItem(k, v));
    clearCurrentFight();

    Object.entries(keep).forEach(([k, v]) => expect(localStorage.getItem(k)).toBe(v));
  });

  it("reports only what it actually removed", () => {
    localStorage.setItem("roundNumber", "3");
    expect(clearCurrentFight()).toEqual(["roundNumber"]);
  });
});
