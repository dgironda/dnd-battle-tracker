/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The cookie bar's answer, and what it does to analytics.
 *
 * This is the switch between "nothing is loaded or sent" and "events are
 * sent", so a regression here would quietly start collecting from people who
 * said no — or who never answered.
 */

const telemetry = vi.hoisted(() => ({
  ANALYTICS_ENABLED: true,
  startAnalytics: vi.fn(async () => null),
  stopAnalytics: vi.fn(),
  resetIdentity: vi.fn(),
}));

/* Analytics is off in tests (dev mode); stand in for it so the calls are made. */
vi.mock("../src/utils/telemetry", () => telemetry);

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

  it("starts analytics on a yes, and remembers it", () => {
    setConsent("granted");
    expect(telemetry.startAnalytics).toHaveBeenCalledTimes(1);
    expect(telemetry.stopAnalytics).not.toHaveBeenCalled();
    expect(readConsent()).toBe("granted");
    expect(needsDecision()).toBe(false);
  });

  it("stops it on a no, which also clears what it kept", () => {
    setConsent("denied");
    expect(telemetry.stopAnalytics).toHaveBeenCalledTimes(1);
    expect(telemetry.startAnalytics).not.toHaveBeenCalled();
  });

  it("does not start anything for somebody who has not answered", () => {
    applyConsent("unset");
    expect(telemetry.startAnalytics).not.toHaveBeenCalled();
  });

  describe("forgetting who signed in", () => {
    it("drops the identity but keeps a yes a yes", () => {
      /* posthog-js's reset() clears its own stored consent, so without the
         re-apply a supporter who agreed would stop being counted. */
      window.localStorage.setItem("analyticsConsent", "granted");
      forgetIdentity();
      expect(telemetry.resetIdentity).toHaveBeenCalled();
      expect(telemetry.startAnalytics).toHaveBeenCalledTimes(1);
      expect(telemetry.resetIdentity.mock.invocationCallOrder[0]).toBeLessThan(
        telemetry.startAnalytics.mock.invocationCallOrder[0],
      );
    });

    it("keeps a no a no", () => {
      window.localStorage.setItem("analyticsConsent", "denied");
      forgetIdentity();
      expect(telemetry.stopAnalytics).toHaveBeenCalled();
      expect(telemetry.startAnalytics).not.toHaveBeenCalled();
    });

    it("does not start anything for somebody who never answered", () => {
      forgetIdentity();
      expect(telemetry.startAnalytics).not.toHaveBeenCalled();
    });
  });
});
