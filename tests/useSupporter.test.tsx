/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

/**
 * Supporter status as the app sees it: asked of the server on load, settled
 * by a sign-in coming back from Patreon, and ended by signing out.
 *
 * Dev mode switches all of this off, so each test loads the hook with the
 * flag off, the way a production build has it.
 */

type Session = { isSupporter: boolean; personId: string | null; available?: boolean };

function server(session: Session) {
  const calls: { url: string; method: string; body?: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body as string | undefined });
      if (init.method === "DELETE") return Response.json({ isSupporter: false, personId: null, available: true });
      return Response.json({ available: true, ...session });
    }),
  );
  return calls;
}

async function loadHook() {
  vi.stubEnv("VITE_DEV_MODE", "false");
  vi.resetModules();
  const { useSupporter } = await import("../src/hooks/useSupporter");
  const { newSignInUrl } = await import("../src/utils/patreonSession");
  return { useSupporter, newSignInUrl };
}

describe("supporter status", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks the server, and believes it", async () => {
    const calls = server({ isSupporter: true, personId: "patreon:1" });
    const { useSupporter } = await loadHook();
    const { result } = renderHook(() => useSupporter(true));

    await waitFor(() => expect(result.current.isSupporter).toBe(true));
    expect(result.current.signedIn).toBe(true);
    expect(result.current.inviteVisible).toBe(false);
    expect(calls.map((c) => c.url)).toEqual(["/api/patreon/session"]);
  });

  it("invites somebody who is not a supporter, once the server has answered", async () => {
    server({ isSupporter: false, personId: null });
    const { useSupporter } = await loadHook();
    const { result } = renderHook(() => useSupporter(true));

    await waitFor(() => expect(result.current.inviteVisible).toBe(true));
    expect(result.current.signedIn).toBe(false);
  });

  it("trades in the code from a sign-in this tab started", async () => {
    const calls = server({ isSupporter: true, personId: "patreon:1" });
    const { useSupporter, newSignInUrl } = await loadHook();
    const state = new URL(newSignInUrl()).searchParams.get("state");
    window.history.replaceState({}, "", `/?code=the-code&state=${state}`);

    const { result } = renderHook(() => useSupporter(true));

    await waitFor(() => expect(result.current.isSupporter).toBe(true));
    expect(calls[0]).toMatchObject({ url: "/api/patreon/exchange", method: "POST" });
    expect(JSON.parse(calls[0].body!)).toEqual({ code: "the-code" });
    expect(window.location.search).toBe("");
  });

  it("refuses a code it never asked for, and says so", async () => {
    const calls = server({ isSupporter: false, personId: null });
    const { useSupporter } = await loadHook();
    window.history.replaceState({}, "", "/?code=somebody-elses");

    const { result } = renderHook(() => useSupporter(true));

    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining("Sign-in not used")));
    await waitFor(() => expect(result.current.inviteVisible).toBe(true));
    expect(calls.map((c) => c.url)).toEqual(["/api/patreon/session"]);
    expect(window.location.search).toBe("");
  });

  it("signs out: ends the session here and turns the perks off", async () => {
    const calls = server({ isSupporter: true, personId: "patreon:1" });
    const { useSupporter } = await loadHook();
    const { result } = renderHook(() => useSupporter(true));
    await waitFor(() => expect(result.current.isSupporter).toBe(true));

    await act(() => result.current.signOut());

    expect(calls.at(-1)).toMatchObject({ url: "/api/patreon/session", method: "DELETE" });
    expect(result.current.isSupporter).toBe(false);
    expect(result.current.signedIn).toBe(false);
  });

  it("stays signed in when the sign-out is cancelled", async () => {
    server({ isSupporter: true, personId: "patreon:1" });
    vi.stubGlobal("confirm", vi.fn(() => false));
    const { useSupporter } = await loadHook();
    const { result } = renderHook(() => useSupporter(true));
    await waitFor(() => expect(result.current.isSupporter).toBe(true));

    await act(() => result.current.signOut());

    expect(result.current.isSupporter).toBe(true);
    expect(result.current.signedIn).toBe(true);
  });
});
