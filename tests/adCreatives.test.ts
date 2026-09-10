import { describe as suite, it, expect } from "vitest";
import {
  eligibleCreatives,
  pickCreative,
  type AdCreative,
} from "../src/constants/AdCreatives";

const at = new Date("2026-09-10T12:00:00Z");

function creative(over: Partial<AdCreative> = {}): AdCreative {
  return {
    id: "example",
    slot: "banner",
    image: "/ads/example.png",
    href: "https://example.com/?tag=x",
    alt: "Advertisement: example",
    ...over,
  };
}

suite("which creatives can run", () => {
  it("keeps only the ones built for that slot", () => {
    const list = [
      creative({ id: "a", slot: "banner" }),
      creative({ id: "b", slot: "tower" }),
    ];
    expect(eligibleCreatives("banner", list, at).map((c) => c.id)).toEqual(["a"]);
    expect(eligibleCreatives("tower", list, at).map((c) => c.id)).toEqual(["b"]);
  });

  it("runs one with no end date forever", () => {
    expect(eligibleCreatives("banner", [creative()], at)).toHaveLength(1);
  });

  it("keeps one right up to the end of its last day", () => {
    const list = [creative({ until: "2026-09-10" })];
    expect(eligibleCreatives("banner", list, at)).toHaveLength(1);
  });

  it("drops one the day after", () => {
    const list = [creative({ until: "2026-09-09" })];
    expect(eligibleCreatives("banner", list, at)).toHaveLength(0);
  });

  it("treats an unreadable date as expired, not as forever", () => {
    /* A typo in a date should take an ad down. The other way round pins a dead
       affiliate link up permanently, which costs the visitor the annoyance and
       returns them a broken page. */
    const list = [creative({ until: "not-a-date" })];
    expect(eligibleCreatives("banner", list, at)).toHaveLength(0);
  });
});

suite("picking one", () => {
  it("returns nothing when the list is empty — the caller falls back", () => {
    expect(pickCreative("banner", [], at)).toBeNull();
  });

  it("returns nothing when everything in the slot has expired", () => {
    const list = [creative({ until: "2020-01-01" })];
    expect(pickCreative("banner", list, at)).toBeNull();
  });

  it("returns the only eligible one", () => {
    const list = [creative({ id: "only" }), creative({ id: "other", slot: "tower" })];
    expect(pickCreative("banner", list, at, () => 0.99)?.id).toBe("only");
  });

  it("honours weight", () => {
    /* "heavy" is 3 of the 4 shares, so it owns the draw from 0.25 upward. */
    const list = [
      creative({ id: "light", weight: 1 }),
      creative({ id: "heavy", weight: 3 }),
    ];
    expect(pickCreative("banner", list, at, () => 0.1)?.id).toBe("light");
    expect(pickCreative("banner", list, at, () => 0.3)?.id).toBe("heavy");
    expect(pickCreative("banner", list, at, () => 0.99)?.id).toBe("heavy");
  });

  it("hides a creative with a nonsense weight rather than breaking the draw", () => {
    const list = [
      creative({ id: "broken", weight: Number.NaN }),
      creative({ id: "fine" }),
    ];
    for (const r of [0, 0.5, 0.999]) {
      expect(pickCreative("banner", list, at, () => r)?.id).toBe("fine");
    }
  });

  it("returns nothing when every weight is unusable", () => {
    const list = [creative({ weight: 0 }), creative({ id: "b", weight: -4 })];
    expect(pickCreative("banner", list, at, () => 0.5)).toBeNull();
  });

  it("never returns undefined at the very top of the range", () => {
    /* Floating-point drift can walk the whole list without the ticket going
       negative; the last entry is the answer rather than a crash. */
    const list = [creative({ id: "a" }), creative({ id: "b" })];
    expect(pickCreative("banner", list, at, () => 0.9999999999)).not.toBeNull();
  });

  it("spreads across the list over many draws", () => {
    const list = [creative({ id: "a" }), creative({ id: "b" }), creative({ id: "c" })];
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const picked = pickCreative("banner", list, at);
      if (picked) seen.add(picked.id);
    }
    expect([...seen].sort()).toEqual(["a", "b", "c"]);
  });
});
