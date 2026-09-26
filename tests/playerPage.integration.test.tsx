/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import { PlayerPage } from "../src/player/PlayerPage";
import { turnCircleVariant } from "../src/utils/handArt";
import type { PlayerView } from "../src/utils/playerView";

/**
 * The page a player opens from the link: what it says while it waits, what the
 * fight looks like once it arrives, and how it takes the connection dropping
 * or the DM stopping.
 */

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send() {}
  close() {
    this.readyState = 3;
  }
}

const CODE = "ABCDEFGHJK";
const socket = () => FakeSocket.instances[FakeSocket.instances.length - 1];
const deliver = (message: unknown) =>
  act(() => {
    socket().readyState = 1;
    socket().onopen?.();
    socket().onmessage?.({ data: JSON.stringify(message) });
  });

const fight: PlayerView = {
  v: 1,
  round: 3,
  updated: 0,
  combatants: [
    { id: "h1", name: "Gerwin the Bold", type: "hero", initiative: 17, hp: "hurt", conditions: ["Blessed"], isCurrentTurn: false },
    { id: "m1", name: "Goblin 1", type: "monster", initiative: 12, hp: "critical", conditions: [], isCurrentTurn: true },
  ],
};

describe("the player page", () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not try to connect for a link that is not a real code", () => {
    render(<PlayerPage code="nope" />);
    expect(screen.getByText(/link doesn.t look right/)).toBeInTheDocument();
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it("watches the room through the player door, and says so while it waits", () => {
    render(<PlayerPage code={CODE} />);
    expect(socket().url).toBe(`ws://localhost:3000/api/room/${CODE}/player`);
    expect(screen.getByText(/Finding the battle/)).toBeInTheDocument();
  });

  it("waits for the DM when nothing has been shared yet", () => {
    render(<PlayerPage code={CODE} />);
    deliver({ t: "view", view: null });
    expect(screen.getByText(/Waiting for your DM to start the battle/)).toBeInTheDocument();
  });

  it("shows the order, whose turn it is, and how hurt — never the numbers", () => {
    render(<PlayerPage code={CODE} />);
    deliver({ t: "view", view: fight });

    expect(screen.getByRole("heading", { name: "Round 3" })).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => within(row).getByText(/Gerwin|Goblin/).textContent)).toEqual([
      "Gerwin the Bold",
      "Goblin 1",
    ]);
    expect(within(rows[1]).getByRole("img", { name: "Their turn" })).toBeInTheDocument();
    expect(within(rows[0]).queryByRole("img", { name: "Their turn" })).toBeNull();
    expect(within(rows[0]).getByText("Hurt")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Blessed")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Barely standing")).toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
  });

  it("circles whose turn it is with the same scrawl the DM's tracker draws round them", () => {
    render(<PlayerPage code={CODE} />);
    deliver({ t: "view", view: fight });

    const [hero, goblin] = screen.getAllByRole("listitem");
    expect(goblin).toHaveClass("is-turn", turnCircleVariant("m1"));
    expect(hero.className).not.toMatch(/turnCircle/);
  });

  it("only explains the hit point words when there is a fight to read them in", () => {
    render(<PlayerPage code={CODE} />);
    deliver({ t: "view", view: null });
    expect(screen.queryByText(/how hurt someone looks/)).toBeNull();

    deliver({ t: "view", view: fight });
    expect(screen.getByText(/how hurt someone looks/)).toBeInTheDocument();
  });

  it("keeps the fight on screen through a dropped connection, and says it is reconnecting", () => {
    render(<PlayerPage code={CODE} />);
    deliver({ t: "view", view: fight });
    act(() => socket().onclose?.());

    expect(screen.getByText("Gerwin the Bold")).toBeInTheDocument();
    expect(screen.getByText(/Reconnecting/)).toBeInTheDocument();

    /* And it goes back for more. */
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it("says when it cannot reach the battle at all", () => {
    render(<PlayerPage code={CODE} />);
    act(() => socket().onclose?.());
    expect(screen.getByText(/Can.t reach the battle/)).toBeInTheDocument();
  });

  it("tells the table when the DM stops sharing, and stops listening", () => {
    render(<PlayerPage code={CODE} />);
    deliver({ t: "view", view: fight });
    deliver({ t: "ended" });

    expect(screen.getByText(/stopped sharing this battle/)).toBeInTheDocument();
    expect(screen.queryByText("Gerwin the Bold")).toBeNull();
    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
