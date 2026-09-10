/**
 * PostHog, served from our own domain.
 *
 * PostHog's warning is accurate: requests to `*.i.posthog.com` are on every
 * mainstream blocklist, so a real share of events never leave the browser and
 * the numbers quietly under-report. Routing them through this origin makes them
 * first-party and they arrive.
 *
 * Two things worth being straight about. This exists to get past ad blockers —
 * that is the whole point of it, it is PostHog's own documented setup, and it
 * measures our own product on our own site. And it does not change what is
 * collected: the payloads are the same ones `src/utils/telemetry.ts` builds, and
 * the `before_send` scrubber still runs in the browser before anything is sent.
 * If you have EU visitors, a proxy does not remove a consent obligation that
 * would otherwise apply — it only changes the hostname the request goes to.
 *
 * The route is `/relay/*`. The prefix is arbitrary and is deliberately not
 * "ingest" or "ph", which are conventional enough that blocklists have started
 * matching the path as well as the host. If this one ever gets listed, change
 * the directory name and `api_host` in main.tsx together — nothing else knows
 * about it.
 *
 * Note the cost side: every capture now goes through a Pages Function, so
 * analytics traffic counts against the project's function invocations rather
 * than PostHog's servers.
 */

/** Where events, feature flags and session data go. */
const API_HOST = "us.i.posthog.com";

/** Where posthog-js fetches its own extra bundles from. */
const ASSET_HOST = "us-assets.i.posthog.com";

export const onRequest: PagesFunction = async (context) => {
  const { request, params, waitUntil } = context;
  const url = new URL(request.url);

  /* `[[path]]` is a catch-all, so this arrives as an array of segments. */
  const segments = Array.isArray(params.path)
    ? params.path
    : params.path
      ? [params.path]
      : [];
  const path = segments.map(encodeURIComponent).join("/");

  /* Everything under /static/ is a CDN file — the surveys, web-vitals and
     dead-click bundles posthog-js pulls in at runtime. The rest is ingestion. */
  const isStatic = segments[0] === "static" || segments[0] === "array";
  const host = isStatic ? ASSET_HOST : API_HOST;
  const upstream = `https://${host}/${path}${url.search}`;

  if (isStatic) {
    return retrieveStatic(request, upstream, waitUntil);
  }
  return forward(request, upstream);
};

/**
 * Pass the capture through.
 *
 * The cookie header is dropped deliberately, following PostHog's own worker
 * example: PostHog identifies a visitor from the payload, not from a cookie, so
 * forwarding this origin's cookies would send them data they neither need nor
 * asked for. The `Host` header goes too — the runtime sets it from the URL, and
 * leaving ours on it makes the upstream request inconsistent.
 */
async function forward(request: Request, upstream: string): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.delete("host");

  return fetch(upstream, {
    method: request.method,
    headers,
    /* GET and HEAD must not carry one, and passing null is not the same as
       omitting it in every runtime. */
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
  });
}

/**
 * Serve a PostHog script, from the edge cache where possible.
 *
 * These are immutable, versioned bundles, so the first visitor in a region pays
 * for the fetch and everybody after them gets it from Cloudflare. Without this
 * the proxy would add a round trip to every page load, which would be a poor
 * trade for better numbers.
 */
async function retrieveStatic(
  request: Request,
  upstream: string,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(upstream);
  /* Only cache a good answer: caching a 500 would pin the outage in place. */
  if (response.ok) {
    waitUntil(cache.put(request, response.clone()));
  }
  return response;
}
