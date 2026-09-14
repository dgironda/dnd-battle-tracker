import { describe, it, expect } from "vitest";
import { supporterPrompt, type SupporterState } from "../src/utils/patreonSession";

/**
 * What a visitor is shown once the server has said who they are.
 *
 * The case this exists for: signing in with an account that has no pledge —
 * the campaign's own creator account, for one — came back to the same "Login /
 * Support us" prompt, whose button is the sign-in, and Patreon sends an account
 * it already knows straight back. Sign in, prompt, sign in, prompt.
 */

const state = (over: Partial<SupporterState> = {}): SupporterState => ({
  isSupporter: false,
  personId: null,
  available: true,
  ...over,
});

describe("what the visitor is shown", () => {
  it("invites somebody who has not signed in", () => {
    expect(supporterPrompt(state(), false)).toBe("invite");
  });

  it("tells a sign-in without a pledge what it found, instead of offering the sign-in again", () => {
    expect(supporterPrompt(state({ personId: "patreon:555" }), true)).toBe("no-pledge");
  });

  it("still invites a signed-in non-supporter on a later visit", () => {
    expect(supporterPrompt(state({ personId: "patreon:555" }), false)).toBe("invite");
  });

  it("shows nothing to a supporter, or when the server could not answer", () => {
    expect(supporterPrompt(state({ isSupporter: true, personId: "patreon:1" }), true)).toBe("none");
    expect(supporterPrompt(state({ available: false }), false)).toBe("none");
    expect(supporterPrompt(state({ available: false, personId: "patreon:555" }), true)).toBe("none");
  });

  it("invites again when the sign-in itself did not produce a person", () => {
    /* A rejected code comes back anonymous: there is nobody to tell about a
       pledge, so the ordinary invite stands. */
    expect(supporterPrompt(state(), true)).toBe("invite");
  });
});
