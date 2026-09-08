import { newRoomCode, newWriteKey, isRoomCode, isWriteKey, playerLink } from "./roomCode";
import type { PlayerView } from "./playerView";

/**
 * The DM's half of the player link.
 *
 * Two strings live here. The CODE is public — it is the link, it goes in a
 * Discord message and onto somebody's phone. The KEY is the DM's alone and
 * never leaves this browser except as a request header; it is what stops
 * anyone who saw the link from pushing a fake battle into the room.
 *
 * Both are kept in localStorage rather than in React state so a room survives
 * a reload mid-session. Losing the key would mean losing the room — the code
 * would still be readable by players but the DM could never write to it again
 * — so `stop` deletes the room on the server before forgetting it locally.
 */

const CODE_KEY = "playerRoomCode";
const WRITE_KEY = "playerRoomKey";

export interface PlayerRoom {
  code: string;
  key: string;
}

/** The room this browser owns, if it still holds a usable pair. */
export function loadRoom(): PlayerRoom | null {
  try {
    const code = localStorage.getItem(CODE_KEY);
    const key = localStorage.getItem(WRITE_KEY);
    /* Both halves or neither. A code without its key is a room that can be
       read by players and never updated again, which is worse than no room. */
    return isRoomCode(code) && isWriteKey(key) ? { code, key } : null;
  } catch {
    return null;
  }
}

function saveRoom(room: PlayerRoom | null): void {
  try {
    if (room) {
      localStorage.setItem(CODE_KEY, room.code);
      localStorage.setItem(WRITE_KEY, room.key);
    } else {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(WRITE_KEY);
    }
  } catch {
    /* Storage full or blocked. The room still works for this session; it just
       will not survive a reload, which is better than refusing to share. */
  }
}

/** Mint a room. Nothing exists on the server until the first push. */
export function createRoom(): PlayerRoom {
  const room = { code: newRoomCode(), key: newWriteKey() };
  saveRoom(room);
  return room;
}

export function linkFor(code: string): string {
  return playerLink(code, window.location.origin);
}

export type PushResult = "ok" | "forbidden" | "offline" | "failed";

/**
 * Send the current state of the fight.
 *
 * Only ever a PlayerView — the projection is built by the caller and this
 * never sees a Combatant, so there is no path by which hit points or notes
 * could be sent even by mistake.
 */
export async function pushView(room: PlayerRoom, view: PlayerView): Promise<PushResult> {
  try {
    const response = await fetch(`/api/room/${room.code}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-battle-key": room.key,
      },
      body: JSON.stringify(view),
    });

    if (response.ok) return "ok";
    /* 403 means the code is held by somebody else's key — the room is not
       ours and no amount of retrying will change that. */
    return response.status === 403 ? "forbidden" : "failed";
  } catch {
    /* A DM's laptop at a table loses wifi. Not an error worth shouting
       about; the next push will carry the current state anyway. */
    return "offline";
  }
}

/** Take the room down, then forget it. */
export async function closeRoom(room: PlayerRoom): Promise<void> {
  try {
    await fetch(`/api/room/${room.code}`, {
      method: "DELETE",
      headers: { "x-battle-key": room.key },
    });
  } catch {
    /* If the delete never lands the room ages out on its own — the server
       treats anything untouched for a week as gone. Forgetting it locally is
       the part that matters to the DM in front of us. */
  }
  saveRoom(null);
}
