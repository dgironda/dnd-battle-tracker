import { DurableObject } from "cloudflare:workers";
import { PING, PONG, type RoomMessage } from "../src/utils/roomProtocol";
import {
  admit,
  onAlarm,
  onConnect,
  onMessage,
  type Effect,
  type RoomRecord,
  type SocketMeta,
} from "./roomLogic";

/**
 * One shared battle.
 *
 * A Durable Object per room code: the DM's tracker connects as the host and
 * publishes, and every player's page connects and is told. Everything this
 * object decides is in roomLogic.ts — here it only does what it is told, with
 * the sockets, storage and alarm the runtime gives it.
 *
 * It uses the WebSocket Hibernation API (`ctx.acceptWebSocket`), so a room
 * with a table connected and nobody doing anything costs nothing: the object
 * sleeps, the sockets stay open, and it wakes only when the DM sends something.
 * The keepalive pings are answered by the runtime without waking it at all.
 *
 * It lives in its own Worker (workers/battle-rooms) because a Pages project
 * cannot define a Durable Object; the site's /api/room function reaches it
 * through the BATTLE_ROOMS binding.
 */
export class BattleRoom extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  async fetch(request: Request): Promise<Response> {
    const entry = admit(
      request.headers.get("Upgrade"),
      new URL(request.url).pathname,
      this.ctx.getWebSockets("player").length,
    );
    if ("status" in entry) return new Response(entry.body, { status: entry.status });

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [entry.role]);
    server.serializeAttachment({ role: entry.role, authed: false } satisfies SocketMeta);

    await this.carryOut(server, onConnect(await this.read(), entry.role));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const meta = ws.deserializeAttachment() as SocketMeta;
    await this.carryOut(ws, onMessage(await this.read(), meta, message, Date.now()));
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    /* Complete the closing handshake. Reserved codes (1005, 1006) cannot be
       sent back, and a socket already gone throws; neither matters. */
    close(ws, code, reason);
  }

  async webSocketError(): Promise<void> {
    /* The runtime closes the socket; there is nothing to tidy. */
  }

  async alarm(): Promise<void> {
    await this.carryOut(null, onAlarm(await this.read(), Date.now()));
  }

  private async read(): Promise<RoomRecord | null> {
    return (await this.ctx.storage.get<RoomRecord>("room")) ?? null;
  }

  private async carryOut(ws: WebSocket | null, effects: Effect[]): Promise<void> {
    for (const effect of effects) {
      await (PERFORM[effect.kind] as Performer<Effect["kind"]>)(this.ctx, ws, effect as never);
    }
  }
}

type Performer<K extends Effect["kind"]> = (
  ctx: DurableObjectState,
  /** The socket the event came from; null for the alarm. */
  ws: WebSocket | null,
  effect: Extract<Effect, { kind: K }>,
) => void | Promise<void>;

/** How each effect roomLogic asks for is carried out. */
const PERFORM: { [K in Effect["kind"]]: Performer<K> } = {
  send: (_ctx, ws, { message }) => {
    if (ws) send(ws, message);
  },
  broadcast: (ctx, _ws, { message }) => {
    for (const player of ctx.getWebSockets("player")) send(player, message);
  },
  store: (ctx, _ws, { record }) =>
    record ? ctx.storage.put("room", record) : ctx.storage.deleteAll(),
  authorise: (_ctx, ws) => {
    ws?.serializeAttachment({ role: "host", authed: true } satisfies SocketMeta);
  },
  close: (_ctx, ws, { code, reason }) => {
    if (ws) close(ws, code, reason);
  },
  closePlayers: (ctx, _ws, { code, reason }) => {
    for (const player of ctx.getWebSockets("player")) close(player, code, reason);
  },
  alarm: (ctx, _ws, { at }) => ctx.storage.setAlarm(at),
};

function send(ws: WebSocket, message: RoomMessage | typeof PONG): void {
  try {
    ws.send(typeof message === "string" ? message : JSON.stringify(message));
  } catch {
    /* The socket closed between the event and the reply. */
  }
}

function close(ws: WebSocket, code: number, reason: string): void {
  try {
    ws.close(code, reason);
  } catch {
    /* already closed */
  }
}
