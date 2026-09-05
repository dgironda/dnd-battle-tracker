import { getMonsters, storeMonsters } from "./LocalStorage";
import { notify } from "./notify";
import type { Monster } from "../types";

const MAX_SHARED_MONSTERS = 1000;

/**
 * Base64 for a URL parameter, via UTF-8 bytes.
 *
 * Plain btoa() throws on anything outside Latin-1, so a monster named with a
 * curly apostrophe or an accent used to break sharing outright.
 */
function encodePayload(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  // URL-safe so the value survives a query string intact.
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

/**
 * Rebuild a monster from untrusted input, keeping only known fields.
 *
 * The old version called this "sanitize" but was really just a deep clone
 * (JSON.parse(JSON.stringify(x))), so anything in the URL landed in storage
 * unchecked — including a javascript: link that would then be rendered as an
 * anchor in the stat block.
 */
function sanitizeMonster(raw: unknown): Monster | null {
  if (raw === null || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.name !== "string" || m.name.trim() === "") return null;

  const hp = num(m.hp ?? m.maxHp, 1);

  return {
    id: typeof m.id === "string" && m.id ? m.id : crypto.randomUUID(),
    name: m.name.slice(0, 100),
    link: safeLink(m.link),
    hp,
    maxHp: num(m.maxHp, hp),
    currHp: num(m.currHp, hp),
    ac: num(m.ac, 10),
    str: num(m.str, 10),
    dex: num(m.dex, 10),
    con: num(m.con, 10),
    int: num(m.int, 10),
    wis: num(m.wis, 10),
    cha: num(m.cha, 10),
    pp: num(m.pp, 0),
    init: num(m.init, 0),
    hidden: Boolean(m.hidden),
    present: Boolean(m.present),
    conditions: Array.isArray(m.conditions)
      ? m.conditions.filter((c): c is string => typeof c === "string")
      : [],
  };
}

const generateMonsterShareURL = async () => {
  const monsters = getMonsters();

  if (!monsters || monsters.length === 0) {
    await notify("Add some monsters to the Monster Manager first.", { title: "Nothing to share" });
    return;
  }

  const baseURL = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.append("monsters", encodePayload(JSON.stringify(monsters)));

  const shareableURL = `${baseURL}?${params.toString()}`;

  // Browsers start refusing very long URLs somewhere around 32k characters.
  if (shareableURL.length > 30000) {
    await notify(
      `That is too many monsters for one link (${monsters.length}). Share a smaller set, or use Download all your data in the Battle Manager.`,
      { title: "Link too long", tone: "warning" }
    );
    return;
  }

  try {
    await navigator.clipboard.writeText(shareableURL);
    await notify("Share link copied to your clipboard.", { title: "Link ready" });
  } catch {
    await notify("Couldn't reach the clipboard. Copy the link from the address bar instead.", {
      title: "Copy failed",
      tone: "warning",
    });
  }

  return shareableURL;
};

const loadMonstersFromURL = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const monstersParam = urlParams.get("monsters");

  if (!monstersParam) return;

  // Clear the parameter up front so a bad payload can't be re-run on reload.
  window.history.replaceState({}, document.title, window.location.pathname);

  try {
    const decoded = JSON.parse(decodePayload(monstersParam));

    if (!Array.isArray(decoded)) {
      await notify("That share link didn't contain a monster list.", {
        title: "Invalid link", tone: "warning",
      });
      return;
    }

    const incoming = decoded
      .map(sanitizeMonster)
      .filter((m): m is Monster => m !== null);

    if (incoming.length === 0) {
      await notify("That share link didn't contain any usable monsters.", {
        title: "Nothing imported", tone: "warning",
      });
      return;
    }

    const existingMonsters = getMonsters() ?? [];
    // Compare against what is already stored. The old version built this set
    // from the incoming list, so it re-issued an id for every monster and never
    // actually detected a collision.
    const existingIds = new Set(existingMonsters.map((m) => m.id));
    const processed = incoming.map((monster) =>
      existingIds.has(monster.id) ? { ...monster, id: crypto.randomUUID() } : monster
    );

    const merged = [...existingMonsters, ...processed];

    if (merged.length > MAX_SHARED_MONSTERS) {
      await notify(`That would leave you with more than ${MAX_SHARED_MONSTERS} monsters.`, {
        title: "Too many monsters", tone: "warning",
      });
      return;
    }

    storeMonsters(merged);

    await notify(`${processed.length} monster(s) added to your Monster Manager.`, {
      title: "Monsters imported",
    });

    // The roster reads from storage on load, so a reload is the simplest way to
    // surface them. Done after the dialog so the message is actually seen.
    window.location.reload();
  } catch (error) {
    console.error("Error loading monsters from URL:", error);
    await notify("That share link couldn't be read.", { title: "Invalid link", tone: "warning" });
  }
};

export default { loadMonstersFromURL, generateMonsterShareURL };
