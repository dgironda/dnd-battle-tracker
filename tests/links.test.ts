/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { safeLink } from "../src/utils/links";

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
