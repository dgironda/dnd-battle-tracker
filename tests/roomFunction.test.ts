import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/room/[code]/[role]";

/**
 * The door to a shared battle: /api/room/:code/:role.
 *
 * It decides who gets as far as a room at all, so the refusals matter as much
 * as the one path through.
 */

const CODE = "ABCDEFGHJK";
const UPGRADE = { Upgrade: "websocket", Connection: "Upgrade" };

function rooms() {
  const reached: { name: string; request: Request }[] = [];
  const namespace = {
    idFromName: (name: string) => ({ name }),
    get: (id: { name: string }) => ({
      fetch: async (request: Request) => {
        reached.push({ name: id.name, request });
        /* Node's Response will not make a 101; the real room does. */
        return new Response("the room", { status: 200 });
      },
    }),
  };
  return { namespace, reached };
}

function call(
  path: { code: string; role: string },
  headers: Record<string, string> = UPGRADE,
  env: Record<string, unknown> = { BATTLE_ROOMS: rooms().namespace },
) {
  const request = new Request(`https://battletracker.example/api/room/${path.code}/${path.role}`, { headers });
  return onRequestGet({ request, env, params: path } as never) as Promise<Response>;
}

describe("the room door", () => {
  it("hands a player's connection to the room named by the code", async () => {
    const { namespace, reached } = rooms();
    const response = await call({ code: CODE, role: "player" }, UPGRADE, { BATTLE_ROOMS: namespace });
    expect(await response.text()).toBe("the room");
    expect(reached).toHaveLength(1);
    expect(reached[0].name).toBe(CODE);
    expect(new URL(reached[0].request.url).pathname).toBe("/player");
    /* The upgrade has to survive the hand-over or the room cannot accept it. */
    expect(reached[0].request.headers.get("Upgrade")).toBe("websocket");
  });

  it("uses the host door for the DM", async () => {
    const { namespace, reached } = rooms();
    await call({ code: CODE, role: "host" }, UPGRADE, { BATTLE_ROOMS: namespace });
    expect(new URL(reached[0].request.url).pathname).toBe("/host");
  });

  it("lets this site's own pages in", async () => {
    const response = await call(
      { code: CODE, role: "player" },
      { ...UPGRADE, Origin: "https://battletracker.example" },
    );
    expect(response.status).toBe(200);
  });

  it("refuses a page on another site", async () => {
    const response = await call({ code: CODE, role: "player" }, { ...UPGRADE, Origin: "https://elsewhere.example" });
    expect(response.status).toBe(403);
  });

  it("refuses a code it could never have issued", async () => {
    expect((await call({ code: "not-a-code", role: "player" })).status).toBe(400);
  });

  it("has no doors but host and player", async () => {
    expect((await call({ code: CODE, role: "admin" })).status).toBe(404);
  });

  it("wants a WebSocket, not a page load", async () => {
    expect((await call({ code: CODE, role: "player" }, {})).status).toBe(426);
  });

  it("says the rooms are unavailable when the binding is missing, rather than throwing", async () => {
    const response = await call({ code: CODE, role: "player" }, UPGRADE, {});
    expect(response.status).toBe(503);
  });
});
