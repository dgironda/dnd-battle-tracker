/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { safeLink, statBlockLink } from "../src/utils/links";

/**
 * A monster's stat-block link goes straight into an href, and it comes from
 * whoever typed it: the DM, a shared encounter, a backup file somebody sent.
 */
describe("safeLink", () => {
  it("keeps ordinary web links", () => {
    expect(safeLink("https://www.dndbeyond.com/monsters/goblin")).toBe(
      "https://www.dndbeyond.com/monsters/goblin",
    );
    expect(safeLink("http://example.com/owlbear")).toBe("http://example.com/owlbear");
  });

  it("refuses anything that would run or open something instead", () => {
    for (const link of [
      "javascript:alert(document.domain)",
      " JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(safeLink(link)).toBe("");
    }
  });

  it("gives nothing for nothing, and for things that are not links", () => {
    expect(safeLink("")).toBe("");
    expect(safeLink(undefined)).toBe("");
    expect(safeLink(42)).toBe("");
  });
});

/**
 * Monsters added from the 2014 list before 0.5.3 saved a 5e.tools link with
 * the creature's whole tag list where its book belongs. Those copies live on
 * in rosters, saved battles, backups and shared encounters.
 */
describe("statBlockLink", () => {
  const OLD_SKELETON =
    "https://5e.tools/bestiary.html#skeleton_['creature', 'mm', 'undead', 'cr 1/4', 'medium']";

  it("mends an old link to the monster's own page", () => {
    expect(statBlockLink(OLD_SKELETON)).toBe("https://5e.tools/bestiary.html#skeleton_mm");
    expect(
      statBlockLink(
        "https://5e.tools/bestiary.html#skeleton%20key_['creature', 'toa', 'undead', 'cr 1/4', 'medium']",
      ),
    ).toBe("https://5e.tools/bestiary.html#skeleton%20key_toa");
  });

  it("mends one a browser has already escaped, as an old shared encounter carries it", () => {
    expect(statBlockLink(safeLink(OLD_SKELETON))).toBe("https://5e.tools/bestiary.html#skeleton_mm");
  });

  it("leaves good links, and other sites, as they are", () => {
    expect(statBlockLink("https://5e.tools/bestiary.html#skeleton_xmm")).toBe(
      "https://5e.tools/bestiary.html#skeleton_xmm",
    );
    expect(statBlockLink("https://www.dndbeyond.com/monsters/goblin")).toBe(
      "https://www.dndbeyond.com/monsters/goblin",
    );
  });

  it("is as strict as safeLink about what it lets through", () => {
    expect(statBlockLink("javascript:alert(1)")).toBe("");
    expect(statBlockLink(undefined)).toBe("");
  });
});
