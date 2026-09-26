/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { GlobalProvider } from "../src/hooks/optionsContext";
import { CombatProvider } from "../src/components/BattleTracker/CombatContext";
import { RosterProvider } from "../src/hooks/rosterContext";
import PlayerLinkProvider from "../src/components/PlayerLinkProvider";
import BattleManager from "../src/components/BattleManager/BattleManager";

/**
 * "Share encounter with players", from the DM's side of the Battle Manager:
 * the link lands on the clipboard, the tracker connects to the room and proves
 * its key, and stopping tells the room and forgets the link.
 */

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
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
  close() {
    this.readyState = 3;
  }
  messages() {
    return this.sent.filter((s) => s !== "ping").map((s) => JSON.parse(s));
  }
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  };
}

function renderManager() {
  return render(
    <GlobalProvider>
      <RosterProvider>
        <CombatProvider>
          <PlayerLinkProvider>
            <BattleManager onClose={() => {}} />
          </PlayerLinkProvider>
        </CombatProvider>
      </RosterProvider>
    </GlobalProvider>,
  );
}

const socket = () => FakeSocket.instances[FakeSocket.instances.length - 1];

describe("sharing the battle with players", () => {
  let clipboard: ReturnType<typeof vi.fn>;
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    FakeSocket.instances = [];
    storage = memoryStorage();
    storage.setItem("storedHeroes", "[]");
    storage.setItem("storedMonsters", "[]");
    storage.setItem("storedCombatants", "[]");
    storage.setItem("savedBattles", "[]");
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
    clipboard = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies a player link, connects to the room and proves the key", async () => {
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: "Share encounter with players" }));

    await waitFor(() => expect(clipboard).toHaveBeenCalledTimes(1));
    const code = storage.getItem("playerRoomCode");
    const key = storage.getItem("playerRoomKey");
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{10}$/);
    expect(clipboard).toHaveBeenCalledWith(`${window.location.origin}/play/${code}`);

    /* Connected to that room's host door, and nothing sent until it opens. */
    await waitFor(() => expect(socket()?.url).toBe(`ws://localhost:3000/api/room/${code}/host`));
    expect(screen.getByText(/Connecting to your players/)).toBeInTheDocument();

    act(() => {
      socket().readyState = 1;
      socket().onopen?.();
    });
    expect(socket().messages()[0]).toEqual({ t: "host", key });

    act(() => socket().onmessage?.({ data: JSON.stringify({ t: "hosting" }) }));
    expect(await screen.findByText(/Live: your players see changes/)).toBeInTheDocument();
  });

  it("pressed again, copies the same link rather than opening a second room", async () => {
    renderManager();
    const button = await screen.findByRole("button", { name: "Share encounter with players" });
    fireEvent.click(button);
    await waitFor(() => expect(clipboard).toHaveBeenCalledTimes(1));
    fireEvent.click(button);
    await waitFor(() => expect(clipboard).toHaveBeenCalledTimes(2));

    expect(clipboard.mock.calls[0][0]).toBe(clipboard.mock.calls[1][0]);
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it("stopping tells the room and forgets the link", async () => {
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: "Share encounter with players" }));
    await waitFor(() => expect(socket()).toBeDefined());
    act(() => {
      socket().readyState = 1;
      socket().onopen?.();
      socket().onmessage?.({ data: JSON.stringify({ t: "hosting" }) });
    });

    fireEvent.click(await screen.findByRole("button", { name: "Stop sharing" }));
    await waitFor(() => expect(socket().messages()).toContainEqual({ t: "end" }));
    act(() => socket().onmessage?.({ data: JSON.stringify({ t: "ended" }) }));

    await waitFor(() => expect(storage.getItem("playerRoomCode")).toBeNull());
    expect(storage.getItem("playerRoomKey")).toBeNull();
    expect(screen.queryByRole("button", { name: "Stop sharing" })).toBeNull();
  });

  it("hands the link over in a box when there is no clipboard", async () => {
    clipboard.mockRejectedValueOnce(new Error("denied"));
    const prompt = vi.fn(() => null);
    vi.stubGlobal("prompt", prompt);
    renderManager();

    fireEvent.click(await screen.findByRole("button", { name: "Share encounter with players" }));
    await waitFor(() => expect(prompt).toHaveBeenCalled());
    const code = storage.getItem("playerRoomCode");
    expect(prompt).toHaveBeenCalledWith(expect.any(String), `${window.location.origin}/play/${code}`);
  });
});
