/**
 * Whether a request was sent by a page on another site.
 *
 * Browsers put `Origin` on every POST and every WebSocket handshake, so a page
 * elsewhere trying to use one of our endpoints shows up here — which is what
 * stops a stranger's page from, say, signing a visitor in with the stranger's
 * Patreon code.
 *
 * No Origin at all is a non-browser client — curl, a script — and cannot be
 * turned against somebody's browser, so that goes on to the route's own checks.
 * An Origin that does not parse (the literal "null" a sandboxed frame sends)
 * counts as foreign.
 */
export function fromAnotherSite(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (origin === null) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}
