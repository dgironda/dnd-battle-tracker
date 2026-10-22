import { newRoomCode, newWriteKey, isRoomCode, isWriteKey, playerLink } from "./roomCode";
import { STORAGE_KEYS } from "./LocalStorage";

/**
 * The DM's half of sharing a battle: which room each campaign owns.
 *
 * Two strings live here. The CODE is public — it is the link, it goes in a
 * Discord message and onto somebody's phone. The KEY is the DM's alone and
 * never leaves this browser except inside the room's WebSocket; it is what
 * stops anyone who saw the link from pushing a fake battle into the room.
 *
 * Both are kept in localStorage rather than in React state, so a room survives
 * a reload mid-session — and, because a room lasts a week past its last
 * change, the same link keeps working for next week's game too.
 *
 * One room per campaign, kept with the campaign's other keys, so one game's
 * fight never turns up on another game's link. The default campaign keeps the
 * original keys, so a room shared before campaigns existed carries on.
 */

export interface PlayerRoom {
  code: string;
  key: string;
}

/** The active campaign's room, if it still holds a usable pair. */
export function loadRoom(): PlayerRoom | null {
  try {
    const code = localStorage.getItem(STORAGE_KEYS.playerRoomCode);
    const key = localStorage.getItem(STORAGE_KEYS.playerRoomKey);
    /* Both halves or neither. A code without its key is a room players can
       watch and nobody can ever update, which is worse than no room. */
    return isRoomCode(code) && isWriteKey(key) ? { code, key } : null;
  } catch {
    return null;
  }
}

function saveRoom(room: PlayerRoom | null): void {
  try {
    if (room) {
      localStorage.setItem(STORAGE_KEYS.playerRoomCode, room.code);
      localStorage.setItem(STORAGE_KEYS.playerRoomKey, room.key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.playerRoomCode);
      localStorage.removeItem(STORAGE_KEYS.playerRoomKey);
    }
  } catch {
    /* Storage full or blocked. The room still works for this session; it just
       will not survive a reload, which is better than refusing to share. */
  }
}

/** Mint a room. Nothing exists on the server until the tracker connects to it. */
export function createRoom(): PlayerRoom {
  const room = { code: newRoomCode(), key: newWriteKey() };
  saveRoom(room);
  return room;
}

/** Forget the room here. Stopping it for the players is roomHost's job. */
export function forgetRoom(): void {
  saveRoom(null);
}

/** The link a DM hands to the table. */
export function linkFor(code: string): string {
  return playerLink(code, window.location.origin);
}

/** Where a page on this site opens a room's WebSocket. */
export function roomSocketUrl(code: string, role: "host" | "player"): string {
  const origin = window.location.origin.replace(/^http/, "ws");
  return `${origin}/api/room/${code}/${role}`;
}
