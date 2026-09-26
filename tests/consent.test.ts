/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The cookie bar's answer, and what it does to analytics.
 *
 * This is the switch between "nothing is captured" and "events are sent", so a
 * regression here would quietly start collecting from people who said no — or
 * who never answered.
 */

const posthog = vi.hoisted(() => ({
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthog }));
/* Analytics is off in tests (dev mode); switch it on so the calls are made. */
vi.mock("../src/utils/telemetry", () => ({ ANALYTICS_ENABLED: true }));

import { applyConsent, forgetIdentity, needsDecision, readConsent, setConsent } from "../src/utils/consent";

describe("analytics consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("starts undecided, and asks", () => {
    expect(readConsent()).toBe("unset");
    expect(needsDecision()).toBe(true);
  });

  it("never reads a refusal to store as a yes", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage refused");
    });
    expect(readConsent()).toBe("unset");
    getItem.mockRestore();
  });

  it("opts in on a yes, and remembers it", () => {
    setConsent("granted");
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(readConsent()).toBe("granted");
    expect(needsDecision()).toBe(false);
  });

  it("opts out on a no, and drops the identifiers already stored", () => {
    setConsent("denied");
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(posthog.reset).toHaveBeenCalledWith(true);
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });

  it("does nothing either way for somebody who has not answered", () => {
    applyConsent("unset");
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();
  });

  describe("forgetting who signed in", () => {
    it("drops the identity but keeps a yes a yes", () => {
      /* posthog-js's reset() clears its own stored consent, so without the
         re-apply a supporter who agreed would stop being counted. */
      window.localStorage.setItem("analyticsConsent", "granted");
      forgetIdentity();
      expect(posthog.reset).toHaveBeenCalled();
      expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
      expect(posthog.reset.mock.invocationCallOrder[0]).toBeLessThan(
        posthog.opt_in_capturing.mock.invocationCallOrder[0],
      );
    });

    it("keeps a no a no", () => {
      window.localStorage.setItem("analyticsConsent", "denied");
      forgetIdentity();
      expect(posthog.opt_out_capturing).toHaveBeenCalled();
      expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
    });

    it("does not opt anybody in who never answered", () => {
      forgetIdentity();
      expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
    });
  });
});
