// The initiative table and dmOS, talking through this browser's storage.
//
// When the table opens, it says so (which heroes it's waiting on), and dmOS's
// bridge frame hears it and asks the party for initiative in dmDM. As the
// players roll, dmOS writes their totals back, and the open table fills them
// into the boxes the DM hasn't typed in. Both are plain keys holding the
// campaign they're for, so a table in one campaign never takes another's rolls.

import { DEFAULT_CAMPAIGN_ID, isCampaignId, readActiveCampaign } from "./LocalStorage";

export const TABLE_KEY = "dmosInitiativeTable";
export const ROLLS_KEY = "dmosInitiativeRolls";

/** The table, as it last said: open or not, the heroes it's waiting on, and when. */
export interface TableCall {
  campaignId: string;
  open: boolean;
  heroes: string[];
  at: number;
}

/** Players' totals from dmDM for the open table, by hero id. */
interface TableRolls {
  campaignId: string;
  at: number;
  rolls: Record<string, number>;
}

const campaignNow = () => readActiveCampaign()?.id ?? DEFAULT_CAMPAIGN_ID;

function readJson(key: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function write(key: string, value: object): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: dmOS just won't hear of it.
  }
}

const isIds = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 60 && value.every((id) => typeof id === "string" && id.length <= 80);
const isTotal = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= -10 && value <= 60;

/** The table opened (waiting on these heroes) or closed, in this page's campaign. */
export function announceTable(open: boolean, heroes: string[]): void {
  write(TABLE_KEY, { campaignId: campaignNow(), open, heroes, at: Date.now() } satisfies TableCall);
}

/** What the table last said, if it reads. */
export function readTable(): TableCall | null {
  const v = readJson(TABLE_KEY);
  if (!v || !isCampaignId(v.campaignId) || typeof v.open !== "boolean" || !isIds(v.heroes) || typeof v.at !== "number") return null;
  return { campaignId: v.campaignId, open: v.open, heroes: v.heroes, at: v.at };
}

/** dmOS: the players' totals so far, for the campaign's open table. */
export function putRolls(campaignId: string, rolls: Record<string, number>): void {
  write(ROLLS_KEY, { campaignId, at: Date.now(), rolls } satisfies TableRolls);
}

/** The players' totals for this page's campaign, written since the table opened (older ones were for some other table). */
export function readRolls(since: number): Record<string, number> {
  const v = readJson(ROLLS_KEY);
  if (!v || v.campaignId !== campaignNow() || typeof v.at !== "number" || v.at < since) return {};
  const rolls = v.rolls && typeof v.rolls === "object" ? Object.entries(v.rolls as Record<string, unknown>) : [];
  return Object.fromEntries(rolls.filter((entry): entry is [string, number] => isTotal(entry[1])));
}

/** Rolls the bridge may write: hero ids to sensible totals, nothing else. */
export function readRollsParam(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length <= 60 && entries.every(([id, total]) => id.length <= 80 && isTotal(total)) ? Object.fromEntries(entries) as Record<string, number> : null;
}
