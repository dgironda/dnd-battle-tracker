import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  loadRoom,
  createRoom,
  closeRoom,
  pushView,
  linkFor,
  type PlayerRoom,
  type PushResult,
} from "../utils/playerRoom";
import type { PlayerView } from "../utils/playerView";

/**
 * Sharing the fight with the table.
 *
 * One room per browser, remembered across reloads. The hook owns three things:
 * whether a room exists, the link to it, and a debounced push of whatever the
 * caller hands it.
 *
 * The debounce is the whole reason this is a hook rather than three functions.
 * A fight changes in bursts — a DM ticks three boxes and applies damage inside
 * two seconds — and pushing each of those separately would be four writes for
 * one visible change. Players are polling every few seconds and cannot tell
 * the difference; the database can.
 */

const PUSH_DEBOUNCE_MS = 1200;

export interface PlayerLink {
  /** The room, or null when not sharing. */
  room: PlayerRoom | null;
  /** The URL to hand to players, or null. */
  url: string | null;
  /** Result of the most recent push, for showing "shared" or a problem. */
  status: PushResult | null;
  /** When the last successful push landed. */
  lastPushed: number | null;

  start: () => PlayerRoom;
  stop: () => Promise<void>;
  /** Queue a push. Safe to call on every render; it coalesces. */
  publish: (view: PlayerView) => void;
}

export function usePlayerLink(): PlayerLink {
  const [room, setRoom] = useState<PlayerRoom | null>(() => loadRoom());
  const [status, setStatus] = useState<PushResult | null>(null);
  const [lastPushed, setLastPushed] = useState<number | null>(null);

  /* The latest view and a pending timer. Refs rather than state: neither
     should cause a render, and the timer must survive one. */
  const pending = useRef<PlayerView | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomRef = useRef(room);
  roomRef.current = room;

  const flush = useCallback(async () => {
    timer.current = null;
    const view = pending.current;
    const current = roomRef.current;
    pending.current = null;
    if (!view || !current) return;

    const result = await pushView(current, view);
    setStatus(result);
    if (result === "ok") setLastPushed(Date.now());
  }, []);

  const publish = useCallback(
    (view: PlayerView) => {
      if (!roomRef.current) return;
      /* Keep the newest view and let the timer run out. Resetting the timer on
         every change would mean a DM working steadily never publishes at all. */
      pending.current = view;
      if (timer.current === null) {
        timer.current = setTimeout(flush, PUSH_DEBOUNCE_MS);
      }
    },
    [flush]
  );

  /* A queued push must not be lost when the tracker unmounts or the tab
     closes mid-fight — that is exactly when the last state matters. */
  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        void flush();
      }
    };
  }, [flush]);

  const start = useCallback(() => {
    const created = createRoom();
    setRoom(created);
    setStatus(null);
    setLastPushed(null);
    return created;
  }, []);

  const stop = useCallback(async () => {
    const current = roomRef.current;
    setRoom(null);
    setStatus(null);
    setLastPushed(null);
    pending.current = null;
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (current) await closeRoom(current);
  }, []);

  return {
    room,
    url: room ? linkFor(room.code) : null,
    status,
    lastPushed,
    start,
    stop,
    publish,
  };
}

/**
 * One room, shared by the two places that care about it: the Battle Manager
 * opens and closes it, the tracker pushes to it. Two separate calls to
 * `usePlayerLink` would each get their own state, so stopping the share in one
 * would leave the other publishing to a room it thought still existed.
 *
 * The context and its consumer live here rather than beside the provider
 * component so that file exports nothing but a component — which is what Fast
 * Refresh needs to reload it without dropping state mid-fight.
 */
export const PlayerLinkContext = createContext<PlayerLink | null>(null);

export function usePlayerLinkContext(): PlayerLink {
  const value = useContext(PlayerLinkContext);
  if (!value) {
    throw new Error("usePlayerLinkContext must be used inside a PlayerLinkProvider");
  }
  return value;
}
