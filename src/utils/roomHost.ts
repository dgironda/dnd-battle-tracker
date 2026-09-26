import type { PlayerView } from "./playerView";
import type { PlayerRoom } from "./playerRoom";
import { roomSocketUrl } from "./playerRoom";
import type { RefusedReason, RoomMessage } from "./roomProtocol";
import { RoomSocket } from "./roomSocket";

/**
 * The DM's tracker, publishing to its room.
 *
 * Holds the newest view and gets it to the room: after proving the key on
 * every (re)connection, at most a few times a second while the fight is
 * changing, and never twice for a change the players could not see.
 */

export type HostStatus =
  /** Opening the connection or proving the key. */
  | "connecting"
  /** Players are seeing changes as they happen. */
  | "live"
  /** Lost the connection; retrying. */
  | "offline"
  /** The room will not take this key — see the reason. */
  | "refused"
  /** Sharing was stopped. */
  | "ended";

/* A DM ticks three boxes and applies damage inside a couple of seconds. A
   quarter of a second is too short for a player to notice and turns that burst
   into a handful of messages instead of dozens. */
const SEND_GAP_MS = 250;

/** How long stopping waits for the room to confirm before giving up. */
const END_TIMEOUT_MS = 5000;

/** The view without its timestamp: two views that draw the same are the same. */
const signatureOf = (view: PlayerView) => JSON.stringify({ ...view, updated: 0 });

export interface RoomHostOptions {
  onStatus: (status: HostStatus, reason?: RefusedReason) => void;
  createSocket?: (url: string) => WebSocket;
}

export class RoomHost {
  private readonly socket: RoomSocket;
  private readonly options: RoomHostOptions;
  private latest: PlayerView | null = null;
  private lastSent: string | null = null;
  private lastSentAt = 0;
  private sendTimer: ReturnType<typeof setTimeout> | null = null;
  private live = false;
  private ending: (() => void) | null = null;

  constructor(room: PlayerRoom, options: RoomHostOptions) {
    this.options = options;
    options.onStatus("connecting");
    this.socket = new RoomSocket({
      url: roomSocketUrl(room.code, "host"),
      onOpen: (send) => {
        send(JSON.stringify({ t: "host", key: room.key }));
      },
      onMessage: (message) => this.receive(message),
      onDrop: () => {
        this.live = false;
        options.onStatus("offline");
      },
      createSocket: options.createSocket,
    });
  }

  /** The fight as players should now see it. Safe to call on every render. */
  publish(view: PlayerView): void {
    this.latest = view;
    if (this.live) this.schedule();
  }

  /**
   * Stop sharing for everybody holding the link.
   *
   * If the connection is down at that moment, this waits for it to come back
   * so the room is actually told — otherwise players would keep seeing the
   * last state for a week. Gives up after a few seconds either way; the room
   * still expires on its own.
   */
  end(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(finish, END_TIMEOUT_MS);
      const socket = this.socket;
      function finish() {
        clearTimeout(timer);
        socket.stop();
        resolve();
      }
      this.ending = finish;
      if (this.live) this.socket.send(JSON.stringify({ t: "end" }));
      else this.socket.wake();
    });
  }

  /** Let go of the connection, leaving the room shared (a reload, a closed tab). */
  close(): void {
    if (this.sendTimer !== null) clearTimeout(this.sendTimer);
    this.sendTimer = null;
    this.socket.stop();
  }

  private receive(message: RoomMessage): void {
    switch (message.t) {
      case "hosting":
        if (this.ending) {
          this.socket.send(JSON.stringify({ t: "end" }));
          return;
        }
        this.live = true;
        /* A fresh connection may be to a room that was expired and reclaimed,
           so what it holds cannot be assumed: send the current view again. */
        this.lastSent = null;
        this.options.onStatus("live");
        this.flush();
        return;
      case "refused":
        this.live = false;
        this.socket.stop();
        this.options.onStatus("refused", message.reason);
        this.ending?.();
        return;
      case "ended":
        this.live = false;
        this.options.onStatus("ended");
        if (this.ending) this.ending();
        else this.socket.stop();
        return;
      case "view":
        /* Rooms do not send views to their host. */
        return;
    }
  }

  private schedule(): void {
    if (this.sendTimer !== null) return;
    const wait = Math.max(0, this.lastSentAt + SEND_GAP_MS - Date.now());
    this.sendTimer = setTimeout(() => {
      this.sendTimer = null;
      this.flush();
    }, wait);
  }

  private flush(): void {
    if (!this.live || !this.latest) return;
    const signature = signatureOf(this.latest);
    if (signature === this.lastSent) return;
    if (this.socket.send(JSON.stringify({ t: "view", view: this.latest }))) {
      this.lastSent = signature;
      this.lastSentAt = Date.now();
    }
  }
}
