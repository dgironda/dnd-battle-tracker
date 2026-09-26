/**
 * Identity for a shared battle.
 *
 * A room has two strings and they do very different jobs:
 *
 *   code  goes in the player link, and is all a player needs to READ the
 *         battle. It is in browser history, in Discord messages, on a phone
 *         screen at the table — treat it as public.
 *
 *   key   never leaves the DM's machine (localStorage) and is required to
 *         WRITE. Without it anyone who saw a link could push a fake battle
 *         into someone else's room, or squat every short code.
 *
 * Both are random rather than derived from the battle's name: a room called
 * "goblin-ambush" would be guessed on the first try.
 */

/* No I, O, 0, 1 — a code gets read aloud across a table and typed by hand. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const CODE_LENGTH = 10; // 32^10 ~= 2^50
const KEY_LENGTH = 26; // 32^26 ~= 2^130, never typed by a person

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let out = "";
  for (const byte of bytes) {
    /* The alphabet is 32 long and a byte is 256, so & 31 is an exact eight-way
       fold — no modulo bias to argue about. */
    out += ALPHABET[byte & 31];
  }
  return out;
}

/** The public half, in the player's link. */
export function newRoomCode(): string {
  return randomString(CODE_LENGTH);
}

/** The private half, kept by the DM. */
export function newWriteKey(): string {
  return randomString(KEY_LENGTH);
}

/**
 * Is this a code we could have issued?
 *
 * Checked before it ever reaches the database so a junk path segment is a 400
 * rather than a query, and so the shape of what we accept is stated once.
 */
export function isRoomCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === CODE_LENGTH &&
    [...value].every((ch) => ALPHABET.includes(ch))
  );
}

export function isWriteKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === KEY_LENGTH &&
    [...value].every((ch) => ALPHABET.includes(ch))
  );
}

/** The link a DM hands to the table. */
export function playerLink(code: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/play/${code}`;
}
