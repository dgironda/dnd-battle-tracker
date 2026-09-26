import type { HpBand, PlayerCombatant, PlayerView } from "./playerView";

/**
 * What travels over a shared battle's WebSocket, in both directions.
 *
 * Three parties read this file: the room (server/roomLogic.ts), the DM's
 * tracker (utils/roomHost.ts) and the player page (player/useRoomView.ts).
 * Every message is JSON with a `t` naming its kind, and every reader parses
 * through the functions here rather than trusting a cast — the room because a
 * socket is a door anyone can knock on, the pages because a room that changed
 * shape under an old tab should be ignored, not rendered half-understood.
 */

/** Sent by either end every so often, answered by the room without waking it. */
export const PING = "ping";
export const PONG = "pong";

/** Refuse anything larger before parsing it. A real fight is a few kilobytes. */
const MAX_MESSAGE_CHARS = 64 * 1024;

/** The DM's tracker, talking to its room. */
export type HostMessage =
  /** First thing on a new connection: prove this is the DM. */
  | { t: "host"; key: string }
  /** The fight as the players should now see it. */
  | { t: "view"; view: PlayerView }
  /** Stop sharing: the link goes dead for everyone holding it. */
  | { t: "end" };

export type RefusedReason =
  /** The room belongs to somebody else's key. */
  | "wrong_key"
  /** A view or an end arrived before the host had proved itself. */
  | "not_host"
  /** The DM already stopped sharing this room. */
  | "ended"
  /** Not a message this room understands. */
  | "bad_message";

/** The room, talking to whoever is connected. */
export type RoomMessage =
  /** The fight right now. Null until the DM has published anything. */
  | { t: "view"; view: PlayerView | null }
  /** The DM's key was accepted. */
  | { t: "hosting" }
  /** The DM stopped sharing. */
  | { t: "ended" }
  | { t: "refused"; reason: RefusedReason };

const HP_BANDS: readonly HpBand[] = ["unharmed", "hurt", "bloodied", "critical", "down"];
const REFUSED: readonly RefusedReason[] = ["wrong_key", "not_host", "ended", "bad_message"];

/* Generous for any real table, and small enough that one room cannot be used
   as somebody's free storage. */
const MAX_COMBATANTS = 200;
const MAX_TEXT = 120;
const MAX_CONDITIONS = 40;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown, max = MAX_TEXT): value is string =>
  typeof value === "string" && value.length <= max;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/* One check per field, and the type insists on all of them: a field added to
   PlayerCombatant does not compile until the room knows how to check it. */
const COMBATANT_FIELDS: { [K in keyof PlayerCombatant]: (value: unknown) => boolean } = {
  id: (value) => isText(value),
  name: (value) => isText(value),
  type: (value) => value === "hero" || value === "monster",
  initiative: isFiniteNumber,
  hp: (value) => HP_BANDS.includes(value as HpBand),
  conditions: (value) =>
    Array.isArray(value) &&
    value.length <= MAX_CONDITIONS &&
    value.every((name) => isText(name, 40)),
  isCurrentTurn: (value) => typeof value === "boolean",
};

function isPlayerCombatant(value: unknown): value is PlayerCombatant {
  if (!isObject(value)) return false;
  return (Object.keys(COMBATANT_FIELDS) as (keyof PlayerCombatant)[]).every((field) =>
    COMBATANT_FIELDS[field](value[field]),
  );
}

/**
 * A view the room may store and pass on.
 *
 * A shape check, not a trust check: the DM is allowed to say what their fight
 * is. What it stops is a stale tab or a hand-written message putting something
 * in front of players that their page cannot draw.
 */
export function isPlayerView(value: unknown): value is PlayerView {
  if (!isObject(value)) return false;
  return (
    value.v === 1 &&
    isFiniteNumber(value.round) &&
    isFiniteNumber(value.updated) &&
    Array.isArray(value.combatants) &&
    value.combatants.length <= MAX_COMBATANTS &&
    value.combatants.every(isPlayerCombatant)
  );
}

function parse(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || raw.length > MAX_MESSAGE_CHARS) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

export function readHostMessage(raw: unknown): HostMessage | null {
  const message = parse(raw);
  if (!message) return null;
  switch (message.t) {
    case "host":
      return isText(message.key, 64) ? { t: "host", key: message.key } : null;
    case "view":
      return isPlayerView(message.view) ? { t: "view", view: message.view } : null;
    case "end":
      return { t: "end" };
    default:
      return null;
  }
}

export function readRoomMessage(raw: unknown): RoomMessage | null {
  const message = parse(raw);
  if (!message) return null;
  switch (message.t) {
    case "view":
      if (message.view === null) return { t: "view", view: null };
      return isPlayerView(message.view) ? { t: "view", view: message.view } : null;
    case "hosting":
      return { t: "hosting" };
    case "ended":
      return { t: "ended" };
    case "refused":
      return REFUSED.includes(message.reason as RefusedReason)
        ? { t: "refused", reason: message.reason as RefusedReason }
        : null;
    default:
      return null;
  }
}
