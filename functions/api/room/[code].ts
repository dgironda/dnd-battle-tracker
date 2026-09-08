import {
  d1RoomStore,
  ROOM_TTL_MS,
  type RoomStore,
} from "../../../server/roomStore";
import { isRoomCode, isWriteKey } from "../../../src/utils/roomCode";
import type { PlayerView } from "../../../src/utils/playerView";

/**
 * The shared battle, over HTTP.
 *
 *   GET    /api/room/:code   what the players see. No key, no auth — the code
 *                            IS the capability, which is why it is 50 bits of
 *                            randomness rather than the battle's name.
 *   PUT    /api/room/:code   the DM pushes. Needs the write key.
 *   DELETE /api/room/:code   the DM gives up the room. Needs the write key.
 *
 * The handler never mentions D1: it asks `storeFor` for a RoomStore and works
 * against that, so the Durable Object version is a different constructor here
 * and nothing else.
 */

interface Env {
  BATTLE_ROOMS: unknown;
}

type Ctx = {
  request: Request;
  env: Env;
  params: { code: string | string[] };
};

/** How long a player may cache a poll. Short — this is a live fight. */
const POLL_CACHE_SECONDS = 1;

/** Refuse anything absurd before it reaches storage. */
const MAX_BODY_BYTES = 64 * 1024;

const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

function storeFor(env: Env): RoomStore {
  return d1RoomStore(env.BATTLE_ROOMS as never);
}

/**
 * Anything that throws becomes a plain 500.
 *
 * Without this the platform's own error middleware answers with the message
 * and the stack — which during development spelled out absolute paths on the
 * machine serving it. A caller learns nothing useful from that and an attacker
 * learns the layout of the deployment.
 */
async function guard(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    console.error("room route failed", err);
    return json({ error: "server_error" }, 500);
  }
}

function codeFrom(params: Ctx["params"]): string | null {
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  return isRoomCode(raw) ? raw : null;
}

/** The DM's key travels in a header, never the URL — URLs get logged. */
function keyFrom(request: Request): string | null {
  const raw = request.headers.get("x-battle-key");
  return isWriteKey(raw) ? raw : null;
}

export const onRequestGet = async ({ env, params }: Ctx): Promise<Response> =>
  guard(async () => {
    const code = codeFrom(params);
    if (!code) return json({ error: "bad_code" }, 400);

    const room = await storeFor(env).read(code);
    if (!room) return json({ error: "not_found" }, 404);

    /* A room nobody has touched for a week is treated as gone even before the
     sweep gets to it, so an old link cannot show a stale fight. */
    if (Date.now() - room.updated > ROOM_TTL_MS)
      return json({ error: "not_found" }, 404);

    return json(room.state, 200, {
      "cache-control": `public, max-age=${POLL_CACHE_SECONDS}`,
    });
  });

export const onRequestPut = async ({
  request,
  env,
  params,
}: Ctx): Promise<Response> =>
  guard(async () => {
    const code = codeFrom(params);
    if (!code) return json({ error: "bad_code" }, 400);

    const key = keyFrom(request);
    if (!key) return json({ error: "bad_key" }, 401);

    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);

    let state: PlayerView;
    try {
      state = (await request.json()) as PlayerView;
    } catch {
      return json({ error: "bad_json" }, 400);
    }

    /* Shape check, not a trust check. The DM's own browser builds this with
     toPlayerView, so the guard is against a stale client or a hand-rolled
     request — not against the DM, who is allowed to say what their fight is. */
    if (!state || state.v !== 1 || !Array.isArray(state.combatants)) {
      return json({ error: "bad_shape" }, 400);
    }

    const result = await storeFor(env).write(code, key, state);
    if (!result.ok) return json({ error: "forbidden" }, 403);

    return json({ ok: true, created: result.created });
  });

export const onRequestDelete = async ({
  request,
  env,
  params,
}: Ctx): Promise<Response> =>
  guard(async () => {
    const code = codeFrom(params);
    if (!code) return json({ error: "bad_code" }, 400);

    const key = keyFrom(request);
    if (!key) return json({ error: "bad_key" }, 401);

    const result = await storeFor(env).remove(code, key);
    if (!result.ok) return json({ error: "forbidden" }, 403);

    return json({ ok: true });
  });
