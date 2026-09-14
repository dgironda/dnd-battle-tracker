import { describe as suite, it, expect } from "vitest";
import {
  clearedCookie,
  cookieFrom,
  countsAsSupporter,
  isActivePatron,
  readSession,
  SESSION_COOKIE,
  sessionCookie,
  signSession,
  type PatreonSession,
} from "../server/patreon";

const SECRET = "a-long-random-string-that-signs-the-session";
const soon = () => Math.floor(Date.now() / 1000) + 3600;

function session(over: Partial<PatreonSession> = {}): PatreonSession {
  return { userId: "4471239", isSupporter: true, exp: soon(), ...over };
}

/**
 * This is the whole of the gate. If a forged cookie verifies, anyone can be a
 * supporter; if a valid one does not, real patrons lose what they paid for.
 */
suite("the session cookie", () => {
  it("round-trips what was put in it", async () => {
    const token = await signSession(session(), SECRET);
    expect(await readSession(token, SECRET)).toMatchObject({
      userId: "4471239",
      isSupporter: true,
    });
  });

  it("refuses a cookie signed with a different secret", async () => {
    const token = await signSession(session(), "some-other-secret");
    expect(await readSession(token, SECRET)).toBeNull();
  });

  it("refuses a tampered payload", async () => {
    /* The obvious attack: flip isSupporter to true and keep the signature. */
    const token = await signSession(session({ isSupporter: false }), SECRET);
    const [, signature] = token.split(".");
    const forged = btoa(JSON.stringify(session({ isSupporter: true })))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await readSession(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it("refuses an expired session", async () => {
    const token = await signSession(session({ exp: Math.floor(Date.now() / 1000) - 1 }), SECRET);
    expect(await readSession(token, SECRET)).toBeNull();
  });

  it("refuses junk without throwing", async () => {
    for (const junk of ["", "nonsense", "a.b", "....", "eyJ9.", "a".repeat(500)]) {
      expect(await readSession(junk, SECRET)).toBeNull();
    }
    expect(await readSession(undefined, SECRET)).toBeNull();
  });
});

suite("cookie plumbing", () => {
  it("is httpOnly and same-site so the browser can neither read nor leak it", () => {
    const header = sessionCookie("token-value", true);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    expect(header).toContain("Path=/");
  });

  it("drops Secure on http, or a local dev session could never be set", () => {
    expect(sessionCookie("token-value", false)).not.toContain("Secure");
  });

  it("clears by expiring immediately", () => {
    expect(clearedCookie(true)).toContain("Max-Age=0");
  });

  it("picks its own cookie out of a crowded header", () => {
    const header = `other=1; ${SESSION_COOKIE}=abc.def; another=2`;
    expect(cookieFrom(header, SESSION_COOKIE)).toBe("abc.def");
    expect(cookieFrom(header, "missing")).toBeUndefined();
    expect(cookieFrom(null, SESSION_COOKIE)).toBeUndefined();
  });
});

suite("who counts as a patron", () => {
  const member = (status: string, campaign?: string) => ({
    type: "member",
    attributes: { patron_status: status },
    relationships: campaign ? { campaign: { data: { id: campaign } } } : undefined,
  });

  it("accepts an active pledge to our campaign", () => {
    expect(isActivePatron({ included: [member("active_patron", "99")] }, "99")).toBe(true);
  });

  it("rejects a former patron", () => {
    expect(isActivePatron({ included: [member("former_patron", "99")] }, "99")).toBe(false);
  });

  it("rejects an active pledge to somebody else's campaign", () => {
    /* The reason PATREON_CAMPAIGN_ID is worth setting: without it this is a
       supporter, and they have never given us anything. */
    expect(isActivePatron({ included: [member("active_patron", "12")] }, "99")).toBe(false);
    expect(isActivePatron({ included: [member("active_patron", "12")] })).toBe(true);
  });

  it("rejects somebody with no memberships at all", () => {
    expect(isActivePatron({ included: [] }, "99")).toBe(false);
    expect(isActivePatron({}, "99")).toBe(false);
  });
});

/**
 * The campaign's own creator has no pledge to it, so the pledge check alone
 * could never let them in — and signing in with that account looped: sign in,
 * "not a supporter", sign in again.
 */
suite("who else gets the perks", () => {
  const creator = { userId: "4471239", isSupporter: false };

  it("lets a team member in without a pledge", () => {
    expect(countsAsSupporter(creator, { PATREON_TEAM_USER_IDS: "4471239" })).toBe(true);
  });

  it("reads a list the way people will type it", () => {
    /* Spaces after the commas, and ids pasted straight out of
       /api/patreon/session with their prefix still on. */
    expect(countsAsSupporter(creator, { PATREON_TEAM_USER_IDS: "10, patreon:4471239 ,22" })).toBe(true);
  });

  it("still asks everybody else for a pledge", () => {
    const stranger = { userId: "555", isSupporter: false };
    expect(countsAsSupporter(stranger, { PATREON_TEAM_USER_IDS: "4471239" })).toBe(false);
    expect(countsAsSupporter(stranger, {})).toBe(false);
    /* An empty entry must not match an empty id. */
    expect(countsAsSupporter({ userId: "", isSupporter: false }, { PATREON_TEAM_USER_IDS: "1,,2" })).toBe(false);
  });

  it("does not match part of an id", () => {
    expect(countsAsSupporter(creator, { PATREON_TEAM_USER_IDS: "447123" })).toBe(false);
  });

  it("changes nothing for a patron", () => {
    expect(countsAsSupporter({ userId: "555", isSupporter: true }, {})).toBe(true);
  });
});
