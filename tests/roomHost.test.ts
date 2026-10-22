/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RoomHost, type HostStatus } from "../src/utils/roomHost";
import type { PlayerView } from "../src/utils/playerView";

/**
 * The DM's side of a shared battle: proving the key on every connection,
 * getting the newest fight to the room without flooding it, and surviving the
 * connection dropping — which, on a laptop at a table, it will.
 */

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  closedWith: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1000) {
    this.closedWith = code;
    this.readyState = 3;
  }
  /* What the network does. */
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
  messages() {
    return this.sent.filter((s) => s !== "ping").map((s) => JSON.parse(s));
  }
}

const ROOM = { code: "ABCDEFGHJK", key: "K".repeat(26) };
const latestSocket = () => FakeSocket.instances[FakeSocket.instances.length - 1];

const view = (round: number, turn = "h1"): PlayerView => ({
  v: 1,
  round,
  updated: Date.now(),
  combatants: [
    { id: "h1", name: "Gerwin", type: "hero", initiative: 17, hp: "hurt", conditions: [], isCurrentTurn: turn === "h1" },
    { id: "m1", name: "Goblin", type: "monster", initiative: 12, hp: "unharmed", conditions: [], isCurrentTurn: turn === "m1" },
  ],
});

function host() {
  const statuses: [HostStatus, string | undefined][] = [];
  const instance = new RoomHost(ROOM, {
    onStatus: (status, reason) => statuses.push([status, reason]),
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
  });
  return { instance, statuses, last: () => statuses[statuses.length - 1]?.[0] };
}

/** Connect and be accepted. */
function accept() {
  const socket = latestSocket();
  socket.open();
  socket.receive({ t: "hosting" });
  return socket;
}

describe("the DM's connection to a shared battle", () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", Object.assign(FakeSocket, { OPEN: 1 }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens the room's host door and proves the key before anything else", () => {
    const { last } = host();
    const socket = latestSocket();
    expect(socket.url).toBe("ws://localhost:3000/api/room/ABCDEFGHJK/host");
    expect(last()).toBe("connecting");

    socket.open();
    expect(socket.messages()).toEqual([{ t: "host", key: ROOM.key }]);
  });

  it("holds the fight until the room accepts the key, then sends it", () => {
    const { instance, last } = host();
    instance.publish(view(1));
    const socket = latestSocket();
    socket.open();
    expect(socket.messages().some((m) => m.t === "view")).toBe(false);

    socket.receive({ t: "hosting" });
    expect(last()).toBe("live");
    expect(socket.messages().filter((m) => m.t === "view")).toHaveLength(1);
  });

  it("turns a burst of changes into one message carrying the latest", () => {
    const { instance } = host();
    const socket = accept();
    instance.publish(view(1));
    vi.advanceTimersByTime(0);

    instance.publish(view(2));
    instance.publish(view(3));
    instance.publish(view(4, "m1"));
    vi.advanceTimersByTime(250);

    const views = socket.messages().filter((m) => m.t === "view");
    expect(views.map((m) => m.view.round)).toEqual([1, 4]);
  });

  it("does not resend a fight the players could not tell apart", () => {
    const { instance } = host();
    const socket = accept();
    instance.publish(view(1));
    vi.advanceTimersByTime(300);
    /* Same fight, new timestamp — e.g. the DM changed a hit point that did
       not cross a band. */
    instance.publish({ ...view(1), updated: Date.now() + 5000 });
    vi.advanceTimersByTime(300);

    expect(socket.messages().filter((m) => m.t === "view")).toHaveLength(1);
  });

  it("reconnects after a drop, proves the key again and resends the fight", () => {
    const { instance, last } = host();
    const first = accept();
    instance.publish(view(2));
    vi.advanceTimersByTime(300);

    first.drop();
    expect(last()).toBe("offline");

    vi.advanceTimersByTime(1000);
    const second = latestSocket();
    expect(second).not.toBe(first);
    second.open();
    expect(second.messages()[0]).toEqual({ t: "host", key: ROOM.key });

    second.receive({ t: "hosting" });
    expect(last()).toBe("live");
    /* The room might have expired and been reclaimed while away, so what it
       holds is not assumed. */
    expect(second.messages().filter((m) => m.t === "view").map((m) => m.view.round)).toEqual([2]);
  });

  it("gives up for good when the room refuses the key", () => {
    const { statuses } = host();
    const socket = latestSocket();
    socket.open();
    socket.receive({ t: "refused", reason: "wrong_key" });
    socket.drop();
    vi.advanceTimersByTime(60_000);

    expect(statuses[statuses.length - 1]).toEqual(["refused", "wrong_key"]);
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it("stops sharing: tells the room, and finishes when the room confirms", async () => {
    const { instance, last } = host();
    const socket = accept();

    const done = instance.end();
    expect(socket.messages()).toContainEqual({ t: "end" });

    socket.receive({ t: "ended" });
    await done;
    expect(last()).toBe("ended");
    expect(socket.closedWith).toBe(1000);
  });

  it("stopping while offline waits for the connection so the room is actually told", async () => {
    const { instance } = host();
    accept().drop();

    const done = instance.end();
    vi.advanceTimersByTime(1000);
    const reconnected = latestSocket();
    reconnected.open();
    reconnected.receive({ t: "hosting" });
    expect(reconnected.messages()).toContainEqual({ t: "end" });

    reconnected.receive({ t: "ended" });
    await done;
  });

  it("stopping gives up after a few seconds if the room never answers", async () => {
    const { instance } = host();
    accept();
    const done = instance.end();
    vi.advanceTimersByTime(5000);
    await expect(done).resolves.toBeUndefined();
  });

  it("keeps an idle connection alive with pings", () => {
    host();
    const socket = accept();
    vi.advanceTimersByTime(25_000 * 2);
    expect(socket.sent.filter((s) => s === "ping")).toHaveLength(2);
  });
});
