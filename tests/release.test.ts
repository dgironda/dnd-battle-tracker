import { describe, it, expect } from "vitest";
import { nextVersion } from "../tools/release.mjs";

/**
 * `npm run release` shows the version it is about to make and waits for a yes,
 * then writes exactly that version. So the number it shows has to be the one
 * `npm version` would have made from the level.
 */

describe("the version a release makes", () => {
  it("raises the level asked for and resets the ones below it", () => {
    expect(nextVersion("0.5.0", "patch")).toBe("0.5.1");
    expect(nextVersion("0.5.3", "minor")).toBe("0.6.0");
    expect(nextVersion("0.9.3", "major")).toBe("1.0.0");
  });

  it("shows the slip that made 0.5.0: a minor where a patch was meant", () => {
    expect(nextVersion("0.4.1", "minor")).toBe("0.5.0");
    expect(nextVersion("0.4.1", "patch")).toBe("0.4.2");
  });

  it("counts past 9 rather than rolling over", () => {
    expect(nextVersion("0.9.9", "patch")).toBe("0.9.10");
    expect(nextVersion("0.9.9", "minor")).toBe("0.10.0");
  });

  it("won't guess at a version that isn't plain x.y.z", () => {
    expect(nextVersion("1.0.0-beta.1", "patch")).toBeNull();
    expect(nextVersion("1.0", "patch")).toBeNull();
  });
});
