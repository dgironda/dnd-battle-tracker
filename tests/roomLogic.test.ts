import { describe, it, expect } from "vitest";
import {
  admit,
  ENDED_TTL_MS,
  MAX_PLAYERS,
  onAlarm,
  onConnect,
  onMessage,
  ROOM_TTL_MS,
  type Effect,
  type RoomRecord,
  type SocketMeta,
} from "../server/roomLogic";
import { isPlayerView, readHostMessage, readRoomMessage, PING, PONG } from "../src/utils/roomProtocol";
import type { PlayerView } from "../src/utils/playerView";

/**
 * The rules of a shared battle: who may write, what players are told, and when
 * a room is forgotten. The Durable Object only carries these out, so this is
 * where the room is actually tested.
 */

const NOW = 1_800_000_000_000;
const KEY = "K".repeat(26);

const view = (over: Partial<PlayerView> = {}): PlayerView => ({
  v: 1,
  round: 2,
  updated: NOW,
  combatants: [
    {
      id: "c1",
      name: "Goblin 1",
      type: "monster",
      initiative: 14,
      hp: "bloodied",
      conditions: ["Prone"],
      isCurrentTurn: true,
    },
  ],
  ...over,
});

const room = (over: Partial<RoomRecord> = {}): RoomRecord => ({
  key: KEY,
  view: view(),
  updated: NOW,
  ended: false,
  ...over,
});

const host = (authed = false): SocketMeta => ({ role: "host", authed });
const player: SocketMeta = { role: "player", authed: false };

const msg = (value: unknown) => JSON.stringify(value);
const kinds = (effects: Effect[]) => effects.map((e) => e.kind);
const stored = (effects: Effect[]) =>
  effects.find((e): e is Extract<Effect, { kind: "store" }> => e.kind === "store")?.record;
const sent = (effects: Effect[]) =>
  effects.filter((e): e is Extract<Effect, { kind: "send" }> => e.kind === "send").map((e) => e.message);

describe("letting a connection in", () => {
  it("takes a WebSocket at the host or player door", () => {
    expect(admit("websocket", "/host", 0)).toEqual({ role: "host" });
    expect(admit("WebSocket", "/player", 3)).toEqual({ role: "player" });
  });

  it("wants a WebSocket", () => {
    expect(admit(null, "/player", 0)).toEqual({ status: 426, body: "expected_websocket" });
  });

  it("stops a link turning into a broadcast channel, but always lets the DM in", () => {
    expect(admit("websocket", "/player", MAX_PLAYERS)).toEqual({ status: 429, body: "room_full" });
    expect(admit("websocket", "/host", MAX_PLAYERS)).toEqual({ role: "host" });
  });
});

describe("a player connecting", () => {
  it("is handed the fight as it stands", () => {
    expect(onConnect(room(), "player")).toEqual([
      { kind: "send", message: { t: "view", view: view() } },
    ]);
  });

  it("is told there is nothing yet when the DM has not published", () => {
    expect(onConnect(null, "player")).toEqual([
      { kind: "send", message: { t: "view", view: null } },
    ]);
  });

  it("is told the DM stopped, rather than left waiting", () => {
    expect(sent(onConnect(room({ ended: true }), "player"))).toEqual([{ t: "ended" }]);
  });

  it("says nothing to a host until it proves itself", () => {
    expect(onConnect(room(), "host")).toEqual([]);
  });
});

describe("the DM claiming and proving a room", () => {
  it("lets the first key claim an empty room, and sets its expiry", () => {
    const effects = onMessage(null, host(), msg({ t: "host", key: KEY }), NOW);
    expect(stored(effects)).toEqual({ key: KEY, view: null, updated: NOW, ended: false });
    expect(kinds(effects)).toContain("authorise");
    expect(sent(effects)).toEqual([{ t: "hosting" }]);
    expect(effects).toContainEqual({ kind: "alarm", at: NOW + ROOM_TTL_MS });
  });

  it("accepts the same key again after a reconnect, without writing anything", () => {
    const effects = onMessage(room(), host(), msg({ t: "host", key: KEY }), NOW);
    expect(kinds(effects)).toEqual(["authorise", "send"]);
  });

  it("turns away somebody else's key and hangs up", () => {
    const effects = onMessage(room(), host(), msg({ t: "host", key: "X".repeat(26) }), NOW);
    expect(sent(effects)).toEqual([{ t: "refused", reason: "wrong_key" }]);
    expect(kinds(effects)).toContain("close");
    expect(kinds(effects)).not.toContain("authorise");
  });

  it("will not reopen a room the DM stopped sharing", () => {
    const effects = onMessage(room({ ended: true }), host(), msg({ t: "host", key: KEY }), NOW);
    expect(sent(effects)).toEqual([{ t: "refused", reason: "ended" }]);
  });
});

describe("publishing", () => {
  it("stores the view and tells every player", () => {
    const next = view({ round: 3 });
    const effects = onMessage(room(), host(true), msg({ t: "view", view: next }), NOW + 5);
    expect(stored(effects)).toEqual(room({ view: next, updated: NOW + 5 }));
    expect(effects).toContainEqual({ kind: "broadcast", message: { t: "view", view: next } });
  });

  it("refuses a view from a socket that never gave the key", () => {
    /* The whole point of the key: knowing the link must not let you push a
       fake battle to somebody else's table. */
    const effects = onMessage(room(), host(false), msg({ t: "view", view: view() }), NOW);
    expect(sent(effects)).toEqual([{ t: "refused", reason: "not_host" }]);
    expect(kinds(effects)).not.toContain("broadcast");
    expect(kinds(effects)).not.toContain("store");
  });

  it("refuses something that is not a view", () => {
    const effects = onMessage(room(), host(true), msg({ t: "view", view: { v: 2 } }), NOW);
    expect(sent(effects)).toEqual([{ t: "refused", reason: "bad_message" }]);
  });

  it("hangs up on a player who talks", () => {
    const effects = onMessage(room(), player, msg({ t: "view", view: view() }), NOW);
    expect(kinds(effects)).toEqual(["close"]);
  });

  it("answers a ping that reaches it", () => {
    expect(onMessage(room(), player, PING, NOW)).toEqual([{ kind: "send", message: PONG }]);
  });
});

describe("stopping", () => {
  it("clears the view, tells the players, closes them, and keeps a short record that it ended", () => {
    const effects = onMessage(room(), host(true), msg({ t: "end" }), NOW);
    expect(stored(effects)).toEqual(room({ view: null, ended: true }));
    expect(effects).toContainEqual({ kind: "broadcast", message: { t: "ended" } });
    expect(kinds(effects)).toContain("closePlayers");
    expect(effects).toContainEqual({ kind: "alarm", at: NOW + ENDED_TTL_MS });
  });

  it("is not something a stranger can do", () => {
    expect(sent(onMessage(room(), host(false), msg({ t: "end" }), NOW))).toEqual([
      { t: "refused", reason: "not_host" },
    ]);
  });
});

describe("expiry", () => {
  it("forgets a room nobody has touched for a week", () => {
    const effects = onAlarm(room(), NOW + ROOM_TTL_MS);
    expect(stored(effects)).toBeNull();
    expect(kinds(effects)).toContain("closePlayers");
  });

  it("re-arms for a room still in use", () => {
    /* The DM published after the alarm was set, so its week starts again. */
    const effects = onAlarm(room({ updated: NOW + 1000 }), NOW + ROOM_TTL_MS);
    expect(effects).toEqual([{ kind: "alarm", at: NOW + 1000 + ROOM_TTL_MS }]);
  });

  it("forgets an ended room after a day", () => {
    expect(stored(onAlarm(room({ ended: true }), NOW + ENDED_TTL_MS))).toBeNull();
    expect(onAlarm(room({ ended: true }), NOW + 1)).toEqual([
      { kind: "alarm", at: NOW + ENDED_TTL_MS },
    ]);
  });

  it("does nothing for a room that is already gone", () => {
    expect(onAlarm(null, NOW)).toEqual([]);
  });
});

describe("reading messages", () => {
  it("rejects junk without throwing", () => {
    for (const junk of [undefined, 42, "", "{", "[]", msg({}), msg({ t: "host" }), msg({ t: "view", view: null })]) {
      expect(readHostMessage(junk)).toBeNull();
    }
    expect(readRoomMessage(msg({ t: "refused", reason: "because" }))).toBeNull();
  });

  it("refuses an oversized message before parsing it", () => {
    expect(readHostMessage(msg({ t: "host", key: KEY }) + " ".repeat(70_000))).toBeNull();
  });

  it("only passes a view players could draw", () => {
    expect(isPlayerView(view())).toBe(true);
    /* Hit point numbers are not part of the shape, so a view carrying a band
       that is not one of ours is rejected rather than rendered. */
    expect(isPlayerView(view({ combatants: [{ ...view().combatants[0], hp: "14 / 97" as never }] }))).toBe(false);
    expect(isPlayerView({ ...view(), v: 2 })).toBe(false);
    expect(isPlayerView(view({ combatants: Array(201).fill(view().combatants[0]) }))).toBe(false);
  });

  it("reads what the room sends", () => {
    expect(readRoomMessage(msg({ t: "view", view: null }))).toEqual({ t: "view", view: null });
    expect(readRoomMessage(msg({ t: "hosting" }))).toEqual({ t: "hosting" });
    expect(readRoomMessage(msg({ t: "refused", reason: "wrong_key" }))).toEqual({
      t: "refused",
      reason: "wrong_key",
    });
  });
});
