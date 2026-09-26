import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createRoom, forgetRoom, linkFor, loadRoom, type PlayerRoom } from "../utils/playerRoom";
import { RoomHost, type HostStatus } from "../utils/roomHost";
import type { PlayerView } from "../utils/playerView";
import type { RefusedReason } from "../utils/roomProtocol";

/**
 * Sharing the fight with the table.
 *
 * One room per browser, remembered across reloads. The Battle Manager starts
 * and stops it; the tracker publishes to it. While a room exists this keeps a
 * connection to it open, so a DM who shared last week and opens the tracker
 * tonight is sharing again the moment the page loads — same link.
 */

export interface PlayerLink {
  /** The room, or null when not sharing. */
  room: PlayerRoom | null;
  /** The link to hand to players, or null. */
  url: string | null;
  /** How the connection to the room is doing, or null when not sharing. */
  status: HostStatus | null;
  /**
   * Why the last room had to be given up, so the Battle Manager can say so.
   * The room is already forgotten by then; sharing again makes a new one.
   */
  lost: RefusedReason | null;
  /** Start sharing if not already, and hand back the link. */
  share: () => string;
  /** Stop sharing: the link goes dead for everyone holding it. */
  stop: () => Promise<void>;
  /** The fight as players should see it. Safe to call on every render. */
  publish: (view: PlayerView) => void;
}

export function usePlayerLink(): PlayerLink {
  const [room, setRoom] = useState<PlayerRoom | null>(() => loadRoom());
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [lost, setLost] = useState<RefusedReason | null>(null);

  const host = useRef<RoomHost | null>(null);
  /* Kept so a connection made later — after a reload, or a share started
     mid-fight — can send the fight straight away instead of waiting for the
     next change. */
  const latest = useRef<PlayerView | null>(null);
  const stopping = useRef(false);

  useEffect(() => {
    if (!room) {
      setStatus(null);
      return;
    }

    const connection = new RoomHost(room, {
      onStatus: (next, reason) => {
        setStatus(next);
        /* A room that refuses this key, or was ended somewhere else, can never
           be written to again. Forget it so the next share is a fresh one. */
        if (next === "refused" || (next === "ended" && !stopping.current)) {
          forgetRoom();
          setRoom(null);
          setLost(reason ?? "ended");
        }
      },
    });
    host.current = connection;
    if (latest.current) connection.publish(latest.current);

    return () => {
      connection.close();
      if (host.current === connection) host.current = null;
    };
  }, [room]);

  const publish = useCallback((view: PlayerView) => {
    latest.current = view;
    host.current?.publish(view);
  }, []);

  const share = useCallback(() => {
    if (room) return linkFor(room.code);
    const created = createRoom();
    setLost(null);
    setRoom(created);
    return linkFor(created.code);
  }, [room]);

  const stop = useCallback(async () => {
    stopping.current = true;
    try {
      await host.current?.end();
    } finally {
      stopping.current = false;
      forgetRoom();
      setRoom(null);
    }
  }, []);

  return {
    room,
    url: room ? linkFor(room.code) : null,
    status,
    lost,
    share,
    stop,
    publish,
  };
}

/**
 * One room, shared by the places that care about it: the Battle Manager opens
 * and closes it, the tracker publishes to it. Two separate `usePlayerLink`
 * calls would each keep their own connection, and stopping one would leave the
 * other sharing.
 *
 * The context lives here rather than beside its provider so that file exports
 * only a component, which is what Fast Refresh needs.
 */
export const PlayerLinkContext = createContext<PlayerLink | null>(null);

/**
 * The app's shared room, or null outside a PlayerLinkProvider.
 *
 * Null rather than a throw: the app always has the provider (main.tsx), and
 * what renders without it is a test mounting one piece of the app — a tracker
 * that simply does not publish, a Battle Manager with no share section.
 */
export function usePlayerLinkContext(): PlayerLink | null {
  return useContext(PlayerLinkContext);
}
