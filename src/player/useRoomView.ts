import { useEffect, useState } from "react";
import type { PlayerView } from "../utils/playerView";
import { roomSocketUrl } from "../utils/playerRoom";
import { RoomSocket } from "../utils/roomSocket";

/**
 * Watching a shared battle from a player's page.
 *
 * The room sends the fight on connecting and again whenever the DM changes it,
 * so this only has to keep listening. Reconnecting after a phone sleeps or the
 * wifi drops is RoomSocket's job; this decides what the page should say while
 * that happens.
 */

export type RoomViewState =
  /** Waiting for the first answer. */
  | { status: "connecting" }
  /** Connected at least once. `view` is null until the DM has published anything. */
  | { status: "watching"; view: PlayerView | null; reconnecting: boolean }
  /** Never reached the room, and still trying. */
  | { status: "unreachable" }
  /** The DM stopped sharing. Nothing more is coming. */
  | { status: "ended" };

export function useRoomView(code: string | null): RoomViewState {
  const [state, setState] = useState<RoomViewState>({ status: "connecting" });

  useEffect(() => {
    if (!code) return;

    const socket = new RoomSocket({
      url: roomSocketUrl(code, "player"),
      /* A player page has nothing to say; it only listens. */
      onOpen: () => {},
      onMessage: (message) => {
        if (message.t === "view") {
          setState({ status: "watching", view: message.view, reconnecting: false });
        } else if (message.t === "ended") {
          socket.stop();
          setState({ status: "ended" });
        }
      },
      onDrop: () =>
        setState((previous) => {
          /* Keep what was on screen and say so quietly, rather than blanking
             the order in the middle of somebody's turn. */
          if (previous.status === "watching") return { ...previous, reconnecting: true };
          if (previous.status === "ended") return previous;
          return { status: "unreachable" };
        }),
    });

    return () => socket.stop();
  }, [code]);

  return state;
}
