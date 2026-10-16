import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequestPost as exchange } from "../functions/api/patreon/exchange";
import { onRequestGet as readSessionRoute, onRequestDelete as signOutRoute } from "../functions/api/patreon/session";

/**
 * The two routes behind the supporter gate, end to end: a code in, a signed
 * cookie out, and that cookie read back. The signing itself is tested in
 * patreonSession.test.ts; this is about what the routes let through and what
 * they hand the browser.
 */

const SITE = "https://battletracker.example";
const ENV = {
  PATREON_CLIENT_ID: "client",
  PATREON_CLIENT_SECRET: "client-secret",
  PATREON_REDIRECT_URI: `${SITE}/`,
  PATREON_SESSION_SECRET: "a long random signing secret for tests",
  PATREON_CAMPAIGN_ID: "campaign-1",
};
/** The same, with the signing secret missing — a deploy that forgot it. */
const UNSIGNED = { ...ENV, PATREON_SESSION_SECRET: undefined };

/** Patreon, answering a token exchange and then an identity lookup. */
function patreon(opts: { userId?: string; pledged?: boolean } = {}) {
  const { userId = "12345", pledged = true } = opts;
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes("/oauth2/token")) {
      return Response.json({ access_token: "access-token" });
    }
    return Response.json({
      data: { id: userId },
      included: pledged
        ? [
            {
              type: "member",
              attributes: { patron_status: "active_patron" },
              relationships: { campaign: { data: { id: "campaign-1" } } },
            },
          ]
        : [],
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

function post(body: string, headers: Record<string, string> = { Origin: SITE }, env: object = ENV) {
  const request = new Request(`${SITE}/api/patreon/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
  return exchange({ request, env } as never) as Promise<Response>;
}

function get(cookie?: string, env: object = ENV) {
  const request = new Request(`${SITE}/api/patreon/session`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  return readSessionRoute({ request, env } as never) as Promise<Response>;
}

/** The `name=value` part of a Set-Cookie header, ready to send back. */
function cookieOf(response: Response): string {
  return (response.headers.get("Set-Cookie") ?? "").split(";")[0];
}

describe("POST /api/patreon/exchange", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("trades a code for a signed, httpOnly session and the two facts the page may know", async () => {
    const { calls } = patreon();
    const response = await post(JSON.stringify({ code: "the-code" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isSupporter: true, personId: "patreon:12345" });

    const setCookie = response.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toMatch(/^bt_supporter=[\w-]+\.[\w-]+;/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Secure");
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    /* The code went to Patreon, with the secret, and nowhere else. */
    expect(calls[0].url).toBe("https://www.patreon.com/api/oauth2/token");
    const form = new URLSearchParams(String(calls[0].init?.body));
    expect(form.get("code")).toBe("the-code");
    expect(form.get("client_secret")).toBe("client-secret");
  });

  it("refuses a page on another site, without asking Patreon anything", async () => {
    const { fetchMock } = patreon();
    const response = await post(JSON.stringify({ code: "their-code" }), {
      Origin: "https://elsewhere.example",
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wants a JSON body with a code in it", async () => {
    patreon();
    expect((await post("not json")).status).toBe(400);
    expect((await post(JSON.stringify({}))).status).toBe(400);
    expect((await post(JSON.stringify({ code: "   " }))).status).toBe(400);
  });

  it("says it is not configured rather than signing with nothing", async () => {
    patreon();
    const response = await post(JSON.stringify({ code: "the-code" }), { Origin: SITE }, UNSIGNED);
    expect(response.status).toBe(500);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("signs in somebody without a pledge, and says they are not a supporter", async () => {
    patreon({ pledged: false });
    const response = await post(JSON.stringify({ code: "the-code" }));
    expect(await response.json()).toEqual({ isSupporter: false, personId: "patreon:12345" });
  });

  it("counts the team as supporters without a pledge", async () => {
    patreon({ userId: "8512477", pledged: false });
    const response = await post(JSON.stringify({ code: "the-code" }), { Origin: SITE }, {
      ...ENV,
      PATREON_TEAM_USER_IDS: "patreon:8512477",
    });
    expect((await response.json()).isSupporter).toBe(true);
  });
});

describe("/api/patreon/session", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads back the session the exchange set", async () => {
    patreon();
    const cookie = cookieOf(await post(JSON.stringify({ code: "the-code" })));

    const response = await get(cookie);
    expect(await response.json()).toEqual({ isSupporter: true, personId: "patreon:12345" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("treats no cookie as an anonymous visitor", async () => {
    expect(await (await get()).json()).toEqual({ isSupporter: false, personId: null, available: true });
  });

  it("does not believe a cookie somebody edited", async () => {
    patreon({ pledged: false });
    const cookie = cookieOf(await post(JSON.stringify({ code: "the-code" })));
    const [name, token] = cookie.split("=");
    const [, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ userId: "12345", isSupporter: true, exp: 9_999_999_999 }),
    ).toString("base64url");

    expect(await (await get(`${name}=${forged}.${signature}`)).json()).toMatchObject({
      isSupporter: false,
      personId: null,
    });
  });

  it("says the gate is unavailable when it cannot verify anything", async () => {
    expect(await (await get(undefined, UNSIGNED)).json()).toMatchObject({ available: false });
  });

  it("signs out by expiring the cookie", async () => {
    const request = new Request(`${SITE}/api/patreon/session`, { method: "DELETE" });
    const response = (await signOutRoute({ request, env: ENV } as never)) as Response;
    const setCookie = response.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toMatch(/^bt_supporter=;/);
    expect(setCookie).toContain("Max-Age=0");
    expect(await response.json()).toMatchObject({ isSupporter: false, personId: null });
  });
});
