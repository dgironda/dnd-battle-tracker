import type { PlayerView } from "../src/utils/playerView";

/**
 * Where a shared battle lives, behind one small interface.
 *
 * The point of this file is that the route handler never names D1. Everything
 * the feature needs is four methods, and D1 is one implementation of them —
 * so moving to a Durable Object later means writing `durableRoomStore.ts`
 * against this same interface and changing which one the route constructs.
 * Nothing about the projection, the routes, the client or the player page
 * changes with it.
 *
 * D1 is the right first choice because Pages Functions can bind it directly:
 * a Durable Object class cannot be defined inside a Pages project at all, so
 * that path costs a second Worker to deploy and a third process to run
 * locally. Worth it for WebSocket push; not worth it for polling.
 */

export interface StoredRoom {
  state: PlayerView;
  updated: number;
}

export type WriteResult =
  /** Stored. */
  | { ok: true; created: boolean }
  /** The code exists and the key does not match it. */
  | { ok: false; reason: "forbidden" };

export interface RoomStore {
  /** The player's side: whatever the DM last pushed, or null. */
  read(code: string): Promise<StoredRoom | null>;

  /**
   * The DM's side. The first write to an unused code CLAIMS it and remembers
   * the key; later writes must present the same key.
   *
   * Claim-on-first-write rather than a separate create call: it means a DM who
   * clears their browser cannot be locked out of a code nobody else holds, and
   * it keeps the client to a single request per change.
   */
  write(code: string, key: string, state: PlayerView): Promise<WriteResult>;

  /** Give up a room — the DM rotating their link, or ending a campaign. */
  remove(code: string, key: string): Promise<WriteResult>;

  /**
   * Drop rooms nobody has touched in a while. A battle is ephemeral and these
   * rows are of no use to anyone once the session is over; without this the
   * table grows forever.
   */
  sweep(olderThan: number): Promise<number>;
}

/** How long an untouched room survives. */
export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------
   D1
   ---------------------------------------------------------------------- */

/** The subset of D1 this uses, so the file can be tested with a fake. */
export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

interface RoomRow {
  write_key: string;
  state: string;
  updated: number;
}

export function d1RoomStore(db: D1Like): RoomStore {
  return {
    async read(code) {
      const row = await db
        .prepare("SELECT state, updated FROM rooms WHERE code = ?")
        .bind(code)
        .first<Pick<RoomRow, "state" | "updated">>();

      if (!row) return null;

      /* A row that cannot be parsed is treated as absent rather than thrown:
         a player opening a link should see "nothing here yet", not a 500. */
      try {
        return { state: JSON.parse(row.state) as PlayerView, updated: row.updated };
      } catch {
        return null;
      }
    },

    async write(code, key, state) {
      const existing = await db
        .prepare("SELECT write_key FROM rooms WHERE code = ?")
        .bind(code)
        .first<Pick<RoomRow, "write_key">>();

      if (existing && !constantTimeEquals(existing.write_key, key)) {
        return { ok: false, reason: "forbidden" };
      }

      const now = Date.now();
      await db
        .prepare(
          `INSERT INTO rooms (code, write_key, state, updated)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(code) DO UPDATE SET state = excluded.state, updated = excluded.updated`
        )
        .bind(code, key, JSON.stringify(state), now)
        .run();

      return { ok: true, created: !existing };
    },

    async remove(code, key) {
      const existing = await db
        .prepare("SELECT write_key FROM rooms WHERE code = ?")
        .bind(code)
        .first<Pick<RoomRow, "write_key">>();

      /* Deleting something that is already gone is a success: the caller's
         goal — "this room does not exist" — is satisfied. */
      if (!existing) return { ok: true, created: false };
      if (!constantTimeEquals(existing.write_key, key)) {
        return { ok: false, reason: "forbidden" };
      }

      await db.prepare("DELETE FROM rooms WHERE code = ?").bind(code).run();
      return { ok: true, created: false };
    },

    async sweep(olderThan) {
      const result = await db
        .prepare("DELETE FROM rooms WHERE updated < ?")
        .bind(olderThan)
        .run();
      return result.meta?.changes ?? 0;
    },
  };
}

/**
 * Compare without leaking where two keys first differ.
 *
 * A plain `===` on a secret returns faster the earlier it finds a difference,
 * which over enough tries tells an attacker the key one character at a time.
 * The keys here are 130 bits of randomness so that attack is thoroughly
 * theoretical — but it costs four lines to not have to think about it.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
