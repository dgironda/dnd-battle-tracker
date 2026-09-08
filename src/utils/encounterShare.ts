import type { Monster } from "../types";

/**
 * Sharing a prepared encounter as a link.
 *
 * The distinction that matters: a SAVED BATTLE is a checkpoint of a fight in
 * progress — current hit points, conditions, spent actions, whose turn it is.
 * An ENCOUNTER is the fight before anyone has rolled: a name and a set of
 * monsters at full health. Only the second is worth sending to another DM,
 * because they bring their own party and start from the top.
 *
 * So this carries monsters and nothing else. No heroes: those are the
 * recipient's. No current HP, no conditions, no ids — all of it is either
 * runtime state the recipient overwrites or a key that has to be reissued on
 * arrival anyway.
 *
 * Dropping that weight is not tidiness, it is capacity. Measured against the
 * stored shape: 392 base64 characters per monster becomes 194, so a link holds
 * ~154 monsters instead of ~76 inside the ~30k the browsers will carry.
 */

/** Bumped if the wire shape ever changes incompatibly. */
const ENCOUNTER_VERSION = 1;

export const ENCOUNTER_PARAM = "e";
/** The old whole-roster link, still read so shared URLs keep working. */
export const LEGACY_MONSTERS_PARAM = "monsters";

/** Browsers start refusing URLs somewhere past this. */
export const MAX_URL_LENGTH = 30000;

export const MAX_ENCOUNTER_MONSTERS = 200;
export const MAX_ENCOUNTER_NAME = 80;

/**
 * The wire shape. Single-letter keys because every byte is a monster we cannot
 * fit; a stat sitting at its default is left out entirely and restored on the
 * way back in.
 */
interface WireMonster {
  n: string;
  hp: number;
  ac?: number;
  s?: number;
  d?: number;
  c?: number;
  i?: number;
  w?: number;
  h?: number;
  p?: number;
  v?: number;
  l?: string;
}

interface WireEncounter {
  v: number;
  n: string;
  m: WireMonster[];
}

export interface Encounter {
  name: string;
  monsters: Monster[];
}

/* -------------------------------------------------------------- encoding */

function encodePayload(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  // URL-safe, and unpadded so the "=" does not need escaping.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodePayload(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Only http(s) links are safe to put in an href we render. */
function safeLink(link: unknown): string {
  if (typeof link !== "string" || link === "") return "";
  try {
    const url = new URL(link, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

const num = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Ability scores default to 10, everything else to 0 — so omit those. */
function trim(value: number | undefined, dflt: number): number | undefined {
  const n = num(value, dflt);
  return n === dflt ? undefined : n;
}

function toWire(m: Monster): WireMonster {
  const hp = num(m.maxHp ?? m.hp, 1);
  const wire: WireMonster = { n: String(m.name ?? "").slice(0, 100), hp };
  const ac = trim(m.ac, 10); if (ac !== undefined) wire.ac = ac;
  const s = trim(m.str, 10); if (s !== undefined) wire.s = s;
  const d = trim(m.dex, 10); if (d !== undefined) wire.d = d;
  const c = trim(m.con, 10); if (c !== undefined) wire.c = c;
  const i = trim(m.int, 10); if (i !== undefined) wire.i = i;
  const w = trim(m.wis, 10); if (w !== undefined) wire.w = w;
  const h = trim(m.cha, 10); if (h !== undefined) wire.h = h;
  const p = trim(m.pp, 0); if (p !== undefined) wire.p = p;
  const v = trim(m.init, 0); if (v !== undefined) wire.v = v;
  const l = safeLink(m.link); if (l) wire.l = l;
  return wire;
}

/**
 * Rebuild a monster from untrusted input, keeping only known fields.
 *
 * Everything here arrives from a stranger's URL, so nothing is trusted: the
 * link is filtered to http(s) (a `javascript:` one would otherwise be rendered
 * as an anchor in the stat block), numbers fall back to their defaults, and the
 * id is minted locally rather than taken from the payload.
 */
function fromWire(raw: unknown): Monster | null {
  if (raw === null || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const name = typeof m.n === "string" ? m.n.trim() : "";
  if (!name) return null;

  const hp = num(m.hp, 1);
  return {
    id: crypto.randomUUID(),
    name: name.slice(0, 100),
    link: safeLink(m.l),
    hp,
    maxHp: hp,
    currHp: hp,
    ac: num(m.ac, 10),
    str: num(m.s, 10),
    dex: num(m.d, 10),
    con: num(m.c, 10),
    int: num(m.i, 10),
    wis: num(m.w, 10),
    cha: num(m.h, 10),
    pp: num(m.p, 0),
    init: num(m.v, 0),
    hidden: false,
    present: true,
    conditions: [],
  };
}

/* ---------------------------------------------------------------- public */

/**
 * The link for an encounter, or null if it would be too long to survive.
 *
 * `base` is passed in rather than read from `window` so this is testable.
 */
export function buildEncounterUrl(
  encounter: Encounter,
  base: string,
): { url: string; tooLong: boolean; length: number } {
  const wire: WireEncounter = {
    v: ENCOUNTER_VERSION,
    n: encounter.name.trim().slice(0, MAX_ENCOUNTER_NAME),
    m: encounter.monsters.map(toWire),
  };
  const params = new URLSearchParams();
  params.append(ENCOUNTER_PARAM, encodePayload(JSON.stringify(wire)));
  const url = `${base}?${params.toString()}`;
  return { url, tooLong: url.length > MAX_URL_LENGTH, length: url.length };
}

/** Read an encounter out of a share link's parameter value. */
export function parseEncounterParam(value: string): Encounter | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(decodePayload(value));
  } catch {
    return null;
  }
  if (decoded === null || typeof decoded !== "object") return null;
  const d = decoded as Record<string, unknown>;
  if (!Array.isArray(d.m)) return null;

  const monsters = d.m
    .map(fromWire)
    .filter((m): m is Monster => m !== null)
    .slice(0, MAX_ENCOUNTER_MONSTERS);
  if (monsters.length === 0) return null;

  const name = typeof d.n === "string" && d.n.trim() ? d.n.trim().slice(0, MAX_ENCOUNTER_NAME) : "";
  return { name, monsters };
}

/**
 * Read the old whole-roster link, which carried the stored monster shape under
 * a different parameter and no name. Kept so links already shared keep working.
 */
export function parseLegacyMonstersParam(value: string): Encounter | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(decodePayload(value));
  } catch {
    return null;
  }
  if (!Array.isArray(decoded)) return null;

  const monsters = decoded
    .map((raw) => {
      if (raw === null || typeof raw !== "object") return null;
      const m = raw as Record<string, unknown>;
      // The legacy shape used full field names; map it onto the wire shape and
      // reuse the same sanitiser rather than keeping two of them.
      return fromWire({
        n: m.name, hp: m.maxHp ?? m.hp, ac: m.ac,
        s: m.str, d: m.dex, c: m.con, i: m.int, w: m.wis, h: m.cha,
        p: m.pp, v: m.init, l: m.link,
      });
    })
    .filter((m): m is Monster => m !== null)
    .slice(0, MAX_ENCOUNTER_MONSTERS);
  if (monsters.length === 0) return null;

  return { name: "", monsters };
}
