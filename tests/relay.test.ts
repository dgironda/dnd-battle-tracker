import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequest } from "../functions/relay/[[path]]";

/**
 * The analytics relay: PostHog through our own domain.
 *
 * It must carry what posthog-js sends and nothing else. Before the allowlist it
 * forwarded any path and method, which let anybody reach PostHog's whole API
 * through this domain and spend the project's shared Functions quota doing it.
 */

const SITE = "https://battletracker.example";

/** Call the relay the way Pages does: the catch-all arrives as path segments. */
function relay(path: string, init: RequestInit = {}) {
  const request = new Request(`${SITE}/relay${path}`, init);
  const segments = new URL(request.url).pathname.replace(/^\/relay\//, "").split("/");
  const waitUntil = vi.fn();
  return onRequest({ request, params: { path: segments }, waitUntil } as never) as Promise<Response>;
}

describe("the analytics relay", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response("upstream", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    cache = { match: vi.fn(async () => undefined), put: vi.fn(async () => {}) };
    vi.stubGlobal("caches", { default: cache });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes an event capture to PostHog, keeping the path and query", async () => {
    const response = await relay("/e/", { method: "POST", body: "payload" });
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://us.i.posthog.com/e/");
    expect(init.method).toBe("POST");
  });

  it("keeps the query string on the way through", async () => {
    await relay("/flags/?v=2&compression=base64", { method: "POST", body: "{}" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://us.i.posthog.com/flags/?v=2&compression=base64");
  });

  it("does not hand PostHog this site's cookies, or anybody's API key", async () => {
    await relay("/i/v0/e/", {
      method: "POST",
      body: "payload",
      headers: { Cookie: "bt_supporter=secret", Authorization: "Bearer phx_personal", "Content-Type": "text/plain" },
    });
    const headers: Headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("content-type")).toBe("text/plain");
  });

  it("serves posthog-js's own bundles from the asset host, and caches a good answer", async () => {
    await relay("/static/recorder.js");
    expect(fetchMock.mock.calls[0][0]).toBe("https://us-assets.i.posthog.com/static/recorder.js");
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("down", { status: 502 }));
    await relay("/array/phc_token/config.js");
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("lets through the public, token-keyed reads posthog-js makes", async () => {
    for (const path of ["/api/surveys/", "/api/early_access_features/", "/api/web_experiments/"]) {
      expect((await relay(path)).status).toBe(200);
    }
  });

  it("refuses the rest of PostHog's API", async () => {
    for (const path of ["/api/projects/1/persons/", "/api/users/@me/", "/decide-something", "/admin"]) {
      expect((await relay(path)).status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only carries the methods posthog-js uses", async () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const response = await relay("/e/", { method, body: "x" });
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET, HEAD, POST");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
