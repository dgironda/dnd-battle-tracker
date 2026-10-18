import { useSyncExternalStore } from "react";
import { predefinedConditions } from "../constants/Conditions";
import { STORAGE_KEYS, writeKey } from "./LocalStorage";

/**
 * Conditions the DM makes up at the table.
 *
 * The picker offers the conditions we ship, and its last entry is for typing
 * one we don't: "Slowed", "Hasted", whatever this fight needs. A condition is
 * only ever its name (`Combatant.conditions` is a list of strings), so a
 * made-up one needs nothing new to be held, counted, logged or shown to the
 * players. Nothing is drawn for it, so its chip is the word — see
 * ConditionMark.
 *
 * What this file keeps is the list of names made so far, so the next combatant
 * who needs "Slowed" can pick it rather than have it typed again. Only the
 * most recent dozen are kept. There is nowhere to delete one yet, and a typo
 * should drop off the end of the list rather than sit in it for good.
 */

/** Longest name the picker takes. The name is the chip, so it has to fit a cell. */
export const CONDITION_NAME_LIMIT = 24;

/** How many made-up names are remembered. */
const REMEMBERED = 12;

/**
 * Spelling that doesn't make a different condition: case, and a space against
 * a hyphen. "death saves" is Death Saves, and "cursed str" is Cursed-Str.
 */
const conditionKey = (name: string) => name.toLowerCase().replace(/[\s-]+/g, "-");

/** Whether a condition is one somebody named, rather than one we ship. */
export const isCustomCondition = (name: string) => !predefinedConditions.includes(name);

/**
 * A typed name, tidied: runs of space closed up, cut to the limit, and a
 * capital to start, like everything else in the list. Null when nothing is
 * left.
 */
export function cleanConditionName(typed: string): string | null {
  const name = typed.replace(/\s+/g, " ").trim().slice(0, CONDITION_NAME_LIMIT).trim();
  if (!name) return null;
  return name[0].toUpperCase() + name.slice(1);
}

/**
 * What a typed name adds. One of ours under another spelling is ours ("prone"
 * is Prone, mark and description included), one already made keeps the
 * spelling it was made with, and anything else is new.
 */
export function resolveConditionName(typed: string, made: readonly string[]): string | null {
  const name = cleanConditionName(typed);
  if (!name) return null;
  const key = conditionKey(name);
  return (
    predefinedConditions.find((c) => conditionKey(c) === key) ??
    made.find((c) => conditionKey(c) === key) ??
    name
  );
}

/* --------------------------------------------------------------- the list */

const NONE: string[] = [];

/* The list as stored and what it parsed to. React needs the SAME array back
   until something changes, and the stored string is how it is known not to
   have. Reading it fresh also means another tab's write, or a test's new
   storage, is never served from a stale copy. */
let cache: { raw: string | null; names: string[] } = { raw: null, names: NONE };

function parse(raw: string | null): string[] {
  if (!raw) return NONE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return NONE;
    /* Anything we have since started shipping gets its mark, so it leaves the
       made-up list. */
    return parsed.filter((n): n is string => typeof n === "string" && isCustomCondition(n));
  } catch {
    return NONE;
  }
}

/** The names made so far, most recently used first. */
export function getCustomConditions(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEYS.customConditions);
  } catch {
    /* Storage blocked: nothing remembered, and nothing to crash over. */
  }
  if (raw !== cache.raw) cache = { raw, names: parse(raw) };
  return cache.names;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  /* A name made in another tab turns up in this one's picker too. */
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEYS.customConditions) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Put a name at the front of the list, adding it if it is new. Picking one
 * again counts as using it, so a name in regular use never drops off.
 */
export function rememberCustomCondition(name: string): void {
  if (!isCustomCondition(name)) return;
  const key = conditionKey(name);
  const names = [name, ...getCustomConditions().filter((n) => conditionKey(n) !== key)];
  try {
    writeKey(STORAGE_KEYS.customConditions, JSON.stringify(names.slice(0, REMEMBERED)));
  } catch {
    /* Storage is full. The condition still goes on: this list only saves some
       typing, and losing it is no reason to get in the way of a fight. */
    return;
  }
  listeners.forEach((listener) => listener());
}

/** The names made so far, kept the same in every picker on the page. */
export function useCustomConditions(): string[] {
  return useSyncExternalStore(subscribe, getCustomConditions, () => NONE);
}
