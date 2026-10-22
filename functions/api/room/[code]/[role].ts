/**
 * GET /api/room/:code/host     the DM's tracker (WebSocket)
 * GET /api/room/:code/player   a player's page (WebSocket)
 *
 * The door to a shared battle. It checks the request is one a room could want
 * and hands the connection to that room's Durable Object; everything after
 * the handshake goes straight between the browser and the room, without coming
 * back through here.
 *
 * The code IS the capability to watch — which is why it is 50 bits of
 * randomness and not the battle's name. Writing needs the DM's key as well,
 * and that is checked by the room itself, on the socket, never in a URL.
 */

import { isRoomCode } from "../../../../src/utils/roomCode";

interface Env {
  /* Optional so a deploy without the rooms Worker bound says so, rather than
     throwing on a missing property. */
  BATTLE_ROOMS?: DurableObjectNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const code = first(params.code);
  const role = first(params.role);

  if (role !== "host" && role !== "player") return plain("not_found", 404);
  if (!isRoomCode(code)) return plain("bad_code", 400);
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return plain("expected_websocket", 426);
  }

  /* Only this site's own pages may open a room. A browser always sends Origin
     on a WebSocket handshake, so a page elsewhere that tries is refused here. */
  const origin = request.headers.get("Origin");
  if (origin !== null && !sameHost(origin, request.url)) return plain("wrong_origin", 403);

  if (!env.BATTLE_ROOMS) {
    console.error("[rooms] the BATTLE_ROOMS binding is missing — is the rooms Worker deployed and bound?");
    return plain("rooms_unavailable", 503);
  }

  const room = env.BATTLE_ROOMS.get(env.BATTLE_ROOMS.idFromName(code));
  /* The room only needs to know which door was used; the original request
     comes along for its upgrade headers. */
  return room.fetch(new Request(`https://battle-room/${role}`, request));
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sameHost(origin: string, url: string): boolean {
  try {
    return new URL(origin).host === new URL(url).host;
  } catch {
    return false;
  }
}

function plain(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
