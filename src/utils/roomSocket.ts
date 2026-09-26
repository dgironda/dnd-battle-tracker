import { PING, PONG, readRoomMessage, type RoomMessage } from "./roomProtocol";

/**
 * A WebSocket to a shared battle that does not stay down.
 *
 * Both ends of a shared battle live on flaky connections: a DM's laptop at a
 * table, a player's phone going to sleep in a pocket, pub wifi. So this is the
 * one place that knows how to keep a room connected — retrying with a growing
 * wait, pinging so an idle connection is not dropped by something in between,
 * and reconnecting at once when a page comes back into view — and the DM's
 * tracker and the player page both sit on top of it.
 */

/** Waits between retries, in order; the last repeats. */
const RETRY_MS = [1000, 2000, 4000, 8000, 15000];

/* Under the ~100 second idle cut-off of the proxies in between. The room
   answers these itself without waking, so they cost nothing to keep up. */
const PING_MS = 25_000;

export interface RoomSocketOptions {
  url: string;
  /** Every time a connection opens, before anything else is sent. */
  onOpen: (send: (data: string) => boolean) => void;
  onMessage: (message: RoomMessage) => void;
  /** The connection dropped and a retry is scheduled. */
  onDrop: () => void;
  /** Stands in for `new WebSocket` in tests. */
  createSocket?: (url: string) => WebSocket;
}

export class RoomSocket {
  private socket: WebSocket | null = null;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private readonly options: RoomSocketOptions;

  constructor(options: RoomSocketOptions) {
    this.options = options;
    document.addEventListener("visibilitychange", this.onVisibility);
    this.connect();
  }

  /** Send if connected. False when there is no open connection to send on. */
  send = (data: string): boolean => {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(data);
    return true;
  };

  /** Stop for good: no more retries. */
  stop(): void {
    this.stopped = true;
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000, "done");
  }

  /** Waiting to retry? Try now instead. */
  wake(): void {
    if (this.stopped || this.socket) return;
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.connect();
  }

  private connect(): void {
    const socket = (this.options.createSocket ?? ((url) => new WebSocket(url)))(this.options.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.attempts = 0;
      this.pingTimer = setInterval(() => this.send(PING), PING_MS);
      this.options.onOpen(this.send);
    };

    socket.onmessage = (event: MessageEvent) => {
      if (this.socket !== socket || event.data === PONG) return;
      const message = readRoomMessage(event.data);
      /* Something this page does not understand is from a newer room than
         this tab. Ignored, not rendered half-read. */
      if (message) this.options.onMessage(message);
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearTimers();
      if (this.stopped) return;
      this.options.onDrop();
      const wait = RETRY_MS[Math.min(this.attempts, RETRY_MS.length - 1)];
      this.attempts += 1;
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.connect();
      }, wait);
    };

    /* An error is always followed by close, which is where retrying happens. */
    socket.onerror = () => {};
  }

  /* A phone that slept has usually lost its connection without being told.
     Coming back into view is the moment somebody is looking, so do not make
     them wait out a retry. */
  private onVisibility = () => {
    if (document.visibilityState === "visible") this.wake();
  };

  private clearTimers(): void {
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.pingTimer = null;
    this.retryTimer = null;
  }
}
