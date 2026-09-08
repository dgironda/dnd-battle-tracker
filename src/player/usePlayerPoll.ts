import { useEffect, useRef, useState } from "react";
import type { PlayerView } from "../utils/playerView";

/**
 * Watching a battle from the outside.
 *
 * Polling rather than a socket, deliberately. A fight moves at the speed of
 * people talking, so three seconds is indistinguishable from instant to
 * somebody holding a phone — and a poll survives a phone sleeping, a tab being
 * backgrounded and a pub wifi dropping out, all of which a socket has to be
 * taught to handle. If this ever needs to be instant, the shape of the data
 * does not change; only this file does.
 */

const POLL_MS = 3000;

export type PollState =
  /** Waiting for the first answer. */
  | { status: "loading" }
  /** The link is dead, or was never real. */
  | { status: "missing" }
  /** We have a battle. `stale` means the last poll failed but this is what we had. */
  | { status: "ready"; view: PlayerView; stale: boolean }
  /** Never got anything and cannot reach the server. */
  | { status: "unreachable" };

export function usePlayerPoll(code: string): PollState {
  const [state, setState] = useState<PollState>({ status: "loading" });

  /* The last good view, so a failed poll can keep showing it rather than
     blanking the screen in the middle of somebody's turn. */
  const lastGood = useRef<PlayerView | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`/api/room/${code}`, { cache: "no-store" });

        if (cancelled) return;

        if (response.status === 404) {
          /* Gone for good: the DM stopped sharing, or the room aged out.
             Nothing to keep showing. */
          lastGood.current = null;
          setState({ status: "missing" });
        } else if (response.ok) {
          const view = (await response.json()) as PlayerView;
          if (cancelled) return;
          lastGood.current = view;
          setState({ status: "ready", view, stale: false });
        } else {
          throw new Error(String(response.status));
        }
      } catch {
        if (cancelled) return;
        /* A blip. Keep what we have and say so, or admit we have nothing. */
        setState(
          lastGood.current
            ? { status: "ready", view: lastGood.current, stale: true }
            : { status: "unreachable" }
        );
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    };

    poll();

    /* A phone in a pocket should not be asking for the battle every three
       seconds; coming back should not wait three seconds either. */
    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        if (timer !== null) clearTimeout(timer);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code]);

  return state;
}
