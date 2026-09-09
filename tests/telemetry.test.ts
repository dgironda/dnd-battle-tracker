import { describe as suite, it, expect } from "vitest";
import { scrubSecrets } from "../src/utils/telemetry";

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
