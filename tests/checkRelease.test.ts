import { describe, it, expect } from "vitest";
import { compareVersions, decideRelease } from "../tools/check-release.mjs";

/**
 * The check `npm run deploy` runs first. Its whole job is to stop the About
 * panel naming the wrong version or build, so each case here is a way that has
 * gone, or could go, wrong.
 */

const clean = { dirtyFiles: [] as string[], version: "0.4.1", head: "abc1234" };

describe("the release check", () => {
  it("stops a deploy with uncommitted changes, and says which", () => {
    const result = decideRelease({ ...clean, dirtyFiles: [" M src/App.tsx"], live: null });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("uncommitted changes");
    expect(result.message).toContain("src/App.tsx");
  });

  it("stops a version that is already live with different code: the 0.4.0 mistake", () => {
    const result = decideRelease({
      dirtyFiles: [],
      version: "0.4.0",
      head: "190dfb1",
      live: { commit: "f137c91", version: "0.4.0" },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("0.4.0 is already live");
    expect(result.message).toContain("npm run release -- patch");
  });

  it("stops a version older than the live one", () => {
    const result = decideRelease({ ...clean, live: { commit: "f137c91", version: "0.5.0" } });
    expect(result.ok).toBe(false);
  });

  it("lets a newer version through", () => {
    const result = decideRelease({ ...clean, live: { commit: "190dfb1", version: "0.4.0" } });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Deploying 0.4.1");
  });

  it("lets the live build be deployed again, whatever the short hashes' lengths", () => {
    const result = decideRelease({ ...clean, head: "abc12345", live: { commit: "abc1234", version: "0.4.1" } });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("already live");
  });

  it("goes ahead, and says so, when it can't tell what is live", () => {
    expect(decideRelease({ ...clean, live: null }).ok).toBe(true);
    const unknownCommit = decideRelease({ ...clean, live: { commit: "0000000", version: null } });
    expect(unknownCommit.ok).toBe(true);
    expect(unknownCommit.message).toContain("wasn't checked");
  });
});

describe("comparing versions", () => {
  it("reads each part as a number, not as text", () => {
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("0.4.0", "0.4.1")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });
});
