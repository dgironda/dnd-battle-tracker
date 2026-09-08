/**
 * What happened, in order.
 *
 * The question this answers is the one every table asks at round five —
 * "wait, how did we get here?" — and the DM currently answers it from memory
 * while four people wait.
 *
 * Entries are written deliberately at the places things happen rather than
 * derived by diffing state. Diffing looked cheaper and is not: the tracker
 * rewrites combatants for reasons that are not events (a Hero Manager edit
 * syncing across, a sort after initiative changes), and a log that invents
 * "Gerwin healed 0" on a re-render is worse than no log.
 *
 * Names are stored as they were at the time. Renaming a goblin should not
 * rewrite what the goblin did.
 */

export type LogKind =
  | "damage"
  | "heal"
  | "temp-hp"
  | "condition-on"
  | "condition-off"
  | "round"
  | "joined"
  | "left"
  | "down"
  | "revived";

export interface LogEntry {
  id: string;
  /** Epoch ms. Shown as a time of day, so a DM can tie it to the session. */
  at: number;
  round: number;
  kind: LogKind;
  /** The name as it was when this happened. */
  who: string;
  /** Damage, healing or temporary hit points. */
  amount?: number;
  /** Hit points before and after, for the two kinds that move them. */
  from?: number;
  to?: number;
  /** A condition's name, or anything else worth one word. */
  detail?: string;
}

/**
 * How many entries are kept.
 *
 * The whole battle lives in localStorage next to the combatants, and that
 * space is already tight enough that photographs had to be moved out to
 * IndexedDB. A long fight is perhaps eighty entries; this holds several and
 * then forgets the oldest, which is the end nobody re-reads.
 */
export const LOG_LIMIT = 250;

let counter = 0;

/** Ids only need to be unique within one battle, and to sort stably. */
function nextId(at: number): string {
  counter += 1;
  return `${at.toString(36)}-${counter.toString(36)}`;
}

export function makeEntry(
  kind: LogKind,
  who: string,
  round: number,
  extra: Partial<Pick<LogEntry, "amount" | "from" | "to" | "detail">> = {},
  at: number = Date.now()
): LogEntry {
  return { id: nextId(at), at, round, kind, who, ...extra };
}

/** Newest last, oldest dropped once the cap is reached. */
export function appendEntry(log: readonly LogEntry[], entry: LogEntry): LogEntry[] {
  const next = [...log, entry];
  return next.length > LOG_LIMIT ? next.slice(next.length - LOG_LIMIT) : next;
}

/**
 * One line of prose.
 *
 * Written the way a DM would say it out loud, because the log is read aloud
 * as often as it is read: "Gerwin took 12, down to 10."
 */
export function describe(entry: LogEntry): string {
  const { who, amount, from, to, detail } = entry;
  const swing =
    from !== undefined && to !== undefined ? `, ${from} to ${to}` : "";

  switch (entry.kind) {
    case "damage":
      return `${who} took ${amount}${swing}`;
    case "heal":
      return `${who} healed ${amount}${swing}`;
    case "temp-hp":
      return amount
        ? `${who} gained ${amount} temporary hit points`
        : `${who} lost their temporary hit points`;
    case "condition-on":
      return `${who} is ${detail}`;
    case "condition-off":
      return `${who} is no longer ${detail}`;
    case "down":
      return `${who} went down`;
    case "revived":
      return `${who} is back up`;
    case "joined":
      return `${who} joined the battle`;
    case "left":
      return `${who} left the battle`;
    case "round":
      return `Round ${entry.round}`;
    default:
      return who;
  }
}

/** hh:mm, in whatever the reader's locale says that looks like. */
export function timeOf(entry: LogEntry): string {
  return new Date(entry.at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface RoundGroup {
  round: number;
  entries: LogEntry[];
}

/**
 * Split into rounds, newest round first.
 *
 * Newest first because the log is opened to look backwards from now. Within a
 * round the entries stay in the order they happened — reading a single round
 * backwards makes no sense.
 *
 * The "round" entries themselves are dropped: they become the headings.
 */
export function groupByRound(log: readonly LogEntry[]): RoundGroup[] {
  const groups = new Map<number, LogEntry[]>();

  for (const entry of log) {
    if (entry.kind === "round") {
      if (!groups.has(entry.round)) groups.set(entry.round, []);
      continue;
    }
    const existing = groups.get(entry.round);
    if (existing) existing.push(entry);
    else groups.set(entry.round, [entry]);
  }

  return [...groups.entries()]
    .map(([round, entries]) => ({ round, entries }))
    .sort((a, b) => b.round - a.round);
}
