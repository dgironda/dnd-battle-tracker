/** @vitest-environment jsdom */
import { describe as suite, it, expect } from "vitest";
import { looksLikeACredential, scrubSecrets } from "../src/utils/telemetry";

/**
 * These are about one thing: a Patreon OAuth authorization code must never
 * reach PostHog. It arrives as `/?code=…` on the redirect and PostHog's
 * pageview capture puts the whole href in `$current_url`, so every string
 * property on every event goes past scrubSecrets on the way out.
 */
suite("scrubSecrets", () => {
  const site = "https://battletracker.simulacrumtechnologies.com";

  it("removes the Patreon authorization code", () => {
    const scrubbed = scrubSecrets(`${site}/?code=abc123secret`);
    expect(scrubbed).not.toContain("abc123secret");
    expect(scrubbed).not.toContain("code=");
  });

  it("removes the OAuth state as well", () => {
    expect(scrubSecrets(`${site}/?state=xyz789`)).not.toContain("xyz789");
  });

  it("keeps utm attribution, which is the reason not to drop the whole query", () => {
    const scrubbed = scrubSecrets(`${site}/?utm_source=reddit&code=abc123&utm_medium=post`);
    expect(scrubbed).toContain("utm_source=reddit");
    expect(scrubbed).toContain("utm_medium=post");
    expect(scrubbed).not.toContain("abc123");
  });

  it("leaves a clean URL exactly as it was", () => {
    const url = `${site}/?utm_source=discord`;
    expect(scrubSecrets(url)).toBe(url);
  });

  it("leaves anything that is not a URL alone", () => {
    /* It runs over every string property, including messages and labels. */
    expect(scrubSecrets("Gerwin took 12, 22 to 10")).toBe("Gerwin took 12, 22 to 10");
    expect(scrubSecrets("some prose that mentions code= for no reason"))
      .toBe("some prose that mentions code= for no reason");
    expect(scrubSecrets("")).toBe("");
  });

  it("catches the code wherever in the query it sits", () => {
    expect(scrubSecrets(`${site}/?a=1&code=secret&b=2`)).not.toContain("secret");
    expect(scrubSecrets(`${site}/some/path?code=secret#hash`)).not.toContain("secret");
  });
});

/**
 * The one rule identify() has to hold: the Patreon OAuth code must never
 * become a person's primary key. `before_send` already strips it out of every
 * URL; identify would put it back as the id every event is filed under.
 */
suite("looksLikeACredential", () => {
  it("refuses the stored Patreon code outright", () => {
    localStorage.setItem("patreon_code", "whatever-shape-this-happens-to-be");
    expect(looksLikeACredential("whatever-shape-this-happens-to-be")).toBe(true);
    localStorage.removeItem("patreon_code");
  });

  it("refuses a token-shaped string even when nothing is stored", () => {
    /* Long, opaque, unpunctuated — an OAuth code looks like this. */
    expect(looksLikeACredential("AbCdEf0123456789AbCdEf0123456789AbCdEf01")).toBe(true);
    expect(looksLikeACredential("a".repeat(64))).toBe(true);
  });

  it("allows a UUID, which is what a real anonymous id looks like", () => {
    expect(looksLikeACredential("019c07b9-cedb-7531-b029-09ec0ddc18a6")).toBe(false);
  });

  it("allows the short ids a real account system hands out", () => {
    expect(looksLikeACredential("12345678")).toBe(false);
    expect(looksLikeACredential("davey")).toBe(false);
    expect(looksLikeACredential("patreon:4471239")).toBe(false);
  });
});
