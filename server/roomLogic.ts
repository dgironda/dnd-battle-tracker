import {
  PING,
  PONG,
  readHostMessage,
  type HostMessage,
  type RefusedReason,
  type RoomMessage,
} from "../src/utils/roomProtocol";
import type { PlayerView } from "../src/utils/playerView";

/**
 * Everything a shared battle decides, with none of the runtime.
 *
 * The Durable Object in battleRoom.ts owns sockets, storage and alarms; this
 * file owns what happens to them. Each event goes in as plain data — what the
 * room holds, who is talking, what they said — and comes out as a list of
 * effects for the object to carry out. That split is what lets the rules be
 * tested without a Workers runtime, and it keeps the object itself too thin to
 * hide a bug in.
 */

/** A room idle this long is deleted. Long enough to share the same link week to week. */
export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** How long "the DM stopped sharing" is kept, so a player's page can say so. */
export const ENDED_TTL_MS = 24 * 60 * 60 * 1000;

/** A table is a handful of people. This stops one link being a broadcast channel. */
export const MAX_PLAYERS = 64;

/** What a room keeps in storage. */
export interface RoomRecord {
  /** The DM's write key. Set by the first host to arrive; checked for every later one. */
  key: string;
  /** The latest view, handed to each player as they connect. */
  view: PlayerView | null;
  /** The last time the DM did anything. Drives expiry. */
  updated: number;
  /** The DM stopped sharing. Kept briefly so players are told rather than left waiting. */
  ended: boolean;
}

export type SocketRole = "host" | "player";

/** What a socket carries across hibernation. */
export interface SocketMeta {
  role: SocketRole;
  /** A host socket that has presented the right key. */
  authed: boolean;
}

/** A WebSocket close code for "you broke the rules" (RFC 6455 policy violation). */
const POLICY = 1008;

export type Effect =
  /** Reply on the socket this event came from. */
  | { kind: "send"; message: RoomMessage | typeof PONG }
  /** Tell every connected player. */
  | { kind: "broadcast"; message: RoomMessage }
  /** Write the room, or forget it entirely with null. */
  | { kind: "store"; record: RoomRecord | null }
  /** Mark the socket this event came from as the DM. */
  | { kind: "authorise" }
  /** Close the socket this event came from. */
  | { kind: "close"; code: number; reason: string }
  /** Close every player's socket. */
  | { kind: "closePlayers"; code: number; reason: string }
  /** Wake the room at this time to see whether it has expired. */
  | { kind: "alarm"; at: number };

/**
 * Whether a connection may come in, and as what.
 *
 * `upgrade` is the request's Upgrade header, `path` which door it used — the
 * site's function forwards the host door as /host — and `players` how many
 * players are already watching.
 */
export function admit(
  upgrade: string | null,
  path: string,
  players: number,
): { role: SocketRole } | { status: number; body: string } {
  if (upgrade?.toLowerCase() !== "websocket") return { status: 426, body: "expected_websocket" };
  if (path === "/host") return { role: "host" };
  if (players >= MAX_PLAYERS) return { status: 429, body: "room_full" };
  return { role: "player" };
}

/** Somebody has just connected. */
export function onConnect(record: RoomRecord | null, role: SocketRole): Effect[] {
  /* The host proves itself with its first message; nothing to say until then. */
  if (role === "host") return [];
  if (record?.ended) return [{ kind: "send", message: { t: "ended" } }];
  return [{ kind: "send", message: { t: "view", view: record?.view ?? null } }];
}

function refuse(reason: RefusedReason): Effect[] {
  return [
    { kind: "send", message: { t: "refused", reason } },
    { kind: "close", code: POLICY, reason },
  ];
}

/** A message arrived. */
export function onMessage(
  record: RoomRecord | null,
  socket: SocketMeta,
  raw: unknown,
  now: number,
): Effect[] {
  /* The room answers pings itself without waking, so one only reaches here if
     that is not set up. Answer it the same way rather than treating it as
     rubbish. */
  if (raw === PING) return [{ kind: "send", message: PONG }];

  /* Players only watch. A player's socket that talks is not a player page, and
     every message it sends is one this room would be billed for. */
  if (socket.role === "player") {
    return [{ kind: "close", code: POLICY, reason: "players_only_watch" }];
  }

  const message = readHostMessage(raw);
  if (!message) return refuse("bad_message");
  return HOST_MESSAGES[message.t](record, socket, message as never, now);
}

type HostHandler<T extends HostMessage["t"]> = (
  record: RoomRecord | null,
  socket: SocketMeta,
  message: Extract<HostMessage, { t: T }>,
  now: number,
) => Effect[];

/** One rule per thing the DM's tracker can say. */
const HOST_MESSAGES: { [T in HostMessage["t"]]: HostHandler<T> } = {
  /* The DM proving the key — or, for an unclaimed room, claiming it. */
  host: (record, socket, message, now) => {
    if (socket.authed) return [{ kind: "send", message: { t: "hosting" } }];
    if (record?.ended) return refuse("ended");
    if (record && record.key !== message.key) return refuse("wrong_key");

    const accepted: Effect[] = [
      { kind: "authorise" },
      { kind: "send", message: { t: "hosting" } },
    ];
    if (record) return accepted;

    /* Unclaimed: the first key to arrive owns it. The code is random and only
       exists once a DM has shared it, so the first key is that DM's. */
    return [
      { kind: "store", record: { key: message.key, view: null, updated: now, ended: false } },
      ...accepted,
      { kind: "alarm", at: now + ROOM_TTL_MS },
    ];
  },

  view: (record, socket, message, now) => {
    if (!socket.authed || !record) return refuse("not_host");
    if (record.ended) return refuse("ended");
    /* No alarm here: expiry is checked from `updated` when the alarm set on
       claiming fires, and it re-arms itself. One storage write per change
       instead of two. */
    return [
      { kind: "store", record: { ...record, view: message.view, updated: now } },
      { kind: "broadcast", message: { t: "view", view: message.view } },
    ];
  },

  end: (record, socket, _message, now) => {
    if (!socket.authed || !record) return refuse("not_host");
    return [
      { kind: "store", record: { ...record, view: null, updated: now, ended: true } },
      { kind: "broadcast", message: { t: "ended" } },
      { kind: "closePlayers", code: 1000, reason: "ended" },
      { kind: "send", message: { t: "ended" } },
      { kind: "close", code: 1000, reason: "ended" },
      { kind: "alarm", at: now + ENDED_TTL_MS },
    ];
  },
};

/** The room's alarm fired. */
export function onAlarm(record: RoomRecord | null, now: number): Effect[] {
  if (!record) return [];

  const lifetime = record.ended ? ENDED_TTL_MS : ROOM_TTL_MS;
  const expires = record.updated + lifetime;

  if (now >= expires) {
    return [
      { kind: "store", record: null },
      { kind: "closePlayers", code: 1000, reason: record.ended ? "ended" : "expired" },
    ];
  }

  /* Still in use: the DM has changed something since this alarm was set. */
  return [{ kind: "alarm", at: expires }];
}
