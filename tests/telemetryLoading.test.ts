/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * posthog-js is loaded only once somebody says yes.
 *
 * Before, it was bundled and started on every load, opted out: nothing was
 * captured, but it still downloaded, fetched its config and asked /flags with
 * an anonymous device id before the visitor had answered the banner. These
 * pin that nothing of PostHog's runs until startAnalytics, and that what the
 * app said in the meantime is not lost when it does.
 */

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
  register: vi.fn(),
  setPersonProperties: vi.fn(),
  identify: vi.fn(),
  captureException: vi.fn(),
}));

const loaded = vi.hoisted(() => ({ count: 0 }));

vi.mock("posthog-js", () => {
  loaded.count += 1;
  return { default: posthog };
});

/** The telemetry module as a production build has it: dev mode off, a key set. */
async function telemetry() {
  vi.stubEnv("VITE_DEV_MODE", "false");
  vi.stubEnv("VITE_PUBLIC_POSTHOG_KEY", "phc_test");
  vi.resetModules();
  return import("../src/utils/telemetry");
}

describe("loading analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loaded.count = 0;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads nothing of PostHog's, and sends nothing, until it is started", async () => {
    const t = await telemetry();
    t.track("battle_started", { heroes: 4, monsters: 6, combatants: 10, grouped_initiative: false });
    t.setPerson({ is_supporter: true });
    t.registerContext({ orientation: "landscape", wallpaper: "parchment", paper_style: "armoury", theme: "light" });

    expect(loaded.count).toBe(0);
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("on starting, opts in and hands over what the app said beforehand", async () => {
    const t = await telemetry();
    t.registerContext({ orientation: "portrait", wallpaper: "slate", paper_style: "armoury", theme: "light" });
    t.setPerson({ is_supporter: true });
    t.identifyPerson("patreon:12345");

    await t.startAnalytics();

    expect(posthog.init).toHaveBeenCalledWith("phc_test", expect.objectContaining({ api_host: "/relay" }));
    expect(posthog.opt_in_capturing).toHaveBeenCalled();
    expect(posthog.register).toHaveBeenCalledWith(expect.objectContaining({ orientation: "portrait", wallpaper: "slate" }));
    expect(posthog.setPersonProperties).toHaveBeenCalledWith({ is_supporter: true });
    expect(posthog.identify).toHaveBeenCalledWith("patreon:12345");
  });

  it("drops an event sent before any yes, but keeps one sent while PostHog is on its way", async () => {
    const t = await telemetry();
    t.track("supporter_prompt_shown", { reason: "first_visit" });
    const starting = t.startAnalytics();
    t.track("supporter_prompt_clicked", { reason: "header" });
    await starting;

    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith("supporter_prompt_clicked", { reason: "header" });
    /* Opted in before the waiting events were played, or they would be dropped. */
    expect(posthog.opt_in_capturing.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.capture.mock.invocationCallOrder[0],
    );
  });

  it("starts once, however often it is asked", async () => {
    const t = await telemetry();
    await Promise.all([t.startAnalytics(), t.startAnalytics()]);
    await t.startAnalytics();
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it("scrubs the sign-in code and state out of anything it sends", async () => {
    const t = await telemetry();
    await t.startAnalytics();
    const { before_send } = posthog.init.mock.calls[0][1];
    const event = before_send({ properties: { $current_url: "https://example.com/?code=abc&state=def&utm_source=x" } });
    expect(event.properties.$current_url).toBe("https://example.com/?utm_source=x");
  });

  it("on a no, opts out, resets, and clears what PostHog stored", async () => {
    const t = await telemetry();
    await t.startAnalytics();
    window.localStorage.setItem("ph_phc_test_posthog", "{}");
    window.localStorage.setItem("__ph_opt_in_out_phc_test", "1");
    window.localStorage.setItem("storedHeroes", "[]");

    t.stopAnalytics();

    expect(posthog.opt_out_capturing).toHaveBeenCalled();
    expect(posthog.reset).toHaveBeenCalledWith(true);
    expect(window.localStorage.getItem("ph_phc_test_posthog")).toBeNull();
    expect(window.localStorage.getItem("__ph_opt_in_out_phc_test")).toBeNull();
    expect(window.localStorage.getItem("storedHeroes")).toBe("[]");
  });

  it("clears leftovers for somebody who never started it, without loading it", async () => {
    const t = await telemetry();
    window.localStorage.setItem("ph_phc_test_posthog", "{}");
    t.stopAnalytics();
    expect(window.localStorage.getItem("ph_phc_test_posthog")).toBeNull();
    expect(loaded.count).toBe(0);
  });
});
