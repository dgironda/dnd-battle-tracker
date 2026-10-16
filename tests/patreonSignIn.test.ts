/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { newSignInUrl, patreonAuthorizeUrl, takeReturnedCode } from "../src/utils/patreonSession";

/**
 * The browser half of Patreon sign-in: the one-time `state` that ties the code
 * Patreon sends back to the sign-in this tab actually started.
 *
 * Without it the page traded in any `?code=` it landed on, so a link carrying
 * somebody else's code signed whoever opened it in as them.
 */

const returned = (query: Record<string, string>) => new URLSearchParams(query);

/**
 * Start a sign-in the way beginPatreonSignIn does (short of leaving the page),
 * and give back the state it sent Patreon — checking it is the one remembered.
 */
function startSignIn(): string {
  const sent = new URL(newSignInUrl()).searchParams.get("state") ?? "";
  expect(window.sessionStorage.getItem("patreonSignInState")).toBe(sent);
  return sent;
}

describe("Patreon sign-in state", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("asks Patreon for the scopes it needs, and sends the state along", () => {
    const url = new URL(patreonAuthorizeUrl("abc123"));
    expect(url.origin + url.pathname).toBe("https://www.patreon.com/oauth2/authorize");
    expect(url.searchParams.get("state")).toBe("abc123");
    expect(url.searchParams.get("scope")).toBe("identity identity.memberships");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("remembers an unguessable state for each sign-in", () => {
    const first = startSignIn();
    const second = startSignIn();
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toMatch(/^[0-9a-f]{32}$/);
    expect(first).not.toBe(second);
  });

  it("uses the code that answers this tab's own sign-in", () => {
    const state = startSignIn();
    expect(takeReturnedCode(returned({ code: "the-code", state }))).toBe("the-code");
  });

  it("refuses a code from a link, which carries somebody else's state or none", () => {
    startSignIn();
    expect(takeReturnedCode(returned({ code: "their-code", state: "0".repeat(32) }))).toBeNull();

    startSignIn();
    expect(takeReturnedCode(returned({ code: "their-code" }))).toBeNull();
  });

  it("refuses a code when this tab never started a sign-in", () => {
    expect(takeReturnedCode(returned({ code: "their-code", state: "anything" }))).toBeNull();
  });

  it("uses each state once, so reloading the redirect cannot trade it in again", () => {
    const state = startSignIn();
    expect(takeReturnedCode(returned({ code: "the-code", state }))).toBe("the-code");
    expect(takeReturnedCode(returned({ code: "the-code", state }))).toBeNull();
  });
});
