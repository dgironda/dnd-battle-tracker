import { useSyncExternalStore } from "react";
import { conditionOptions } from "../constants/Conditions";
import { cleanConditionName } from "./customConditions";
import { campaignKey, removeKey, STORAGE_KEYS, writeKey } from "./LocalStorage";

/**
 * A campaign's own list of conditions, set in dmOS's Rules Manager.
 *
 * Without one, the tracker offers what we ship. With one, the picker offers
 * exactly the campaign's list, in its order, and its descriptions are the
 * ones the reminders and the conditions editor show. A DM can reword a
 * condition for their table ("Frightened: and you drop what you're holding"),
 * stop offering one, or add one of their own.
 *
 * Names we ship keep their meaning when they are on the list: the tracker
 * still draws their mark, takes Ready off at the start of its owner's turn,
 * and so on. Nothing here can rename one.
 */

export interface ConditionRule {
  name: string;
  /** What the reminder says about it. Empty for a bare name. */
  description: string;
}

export interface ConditionRules {
  conditions: ConditionRule[];
}

/** Enough for any table's list; past this it is a mistake, not a campaign. */
const MAX_CONDITIONS = 120;
const DESCRIPTION_LIMIT = 2000;

/** Rules as dmOS sent them (or as stored), made safe to use; null if unusable. */
export function cleanConditionRules(value: unknown): ConditionRules | null {
  const list = (value as { conditions?: unknown } | null)?.conditions;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const conditions: ConditionRule[] = [];
  for (const entry of list.slice(0, MAX_CONDITIONS)) {
    const raw = entry as { name?: unknown; description?: unknown } | null;
    const name = typeof raw?.name === "string" ? cleanConditionName(raw.name) : null;
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const description = typeof raw?.description === "string" ? raw.description.slice(0, DESCRIPTION_LIMIT) : "";
    conditions.push({ name, description });
  }
  return { conditions };
}

/** Set (or with null, clear back to what we ship) a campaign's conditions. */
export function storeCampaignConditionRules(campaignId: string, rules: ConditionRules | null): void {
  const key = campaignKey("conditionRules", campaignId);
  if (rules) writeKey(key, JSON.stringify(rules));
  else removeKey(key);
}

export function getCampaignConditionRules(campaignId: string): ConditionRules | null {
  try {
    const raw = localStorage.getItem(campaignKey("conditionRules", campaignId));
    return raw ? cleanConditionRules(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/* The active campaign's, kept the same object until the stored text changes,
   as useSyncExternalStore needs. */
let cache: { raw: string | null; rules: ConditionRules | null } = { raw: null, rules: null };

function readActive(): ConditionRules | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEYS.conditionRules);
  } catch {
    /* Storage blocked: the shipped list. */
  }
  if (raw !== cache.raw) {
    let rules: ConditionRules | null = null;
    try {
      rules = raw ? cleanConditionRules(JSON.parse(raw)) : null;
    } catch {
      rules = null;
    }
    cache = { raw, rules };
  }
  return cache.rules;
}

/* dmOS writes through the bridge, in another frame: that reaches an open
   tracker as a storage event. */
function subscribe(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEYS.conditionRules) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** The active campaign's conditions, or null to use what we ship. */
export function useConditionRules(): ConditionRules | null {
  return useSyncExternalStore(subscribe, readActive, () => null);
}

/** What the picker offers: the campaign's list, or the shipped one. */
export function conditionChoices(rules: ConditionRules | null): string[] {
  return rules ? rules.conditions.map((c) => c.name) : conditionOptions;
}

/** The descriptions to show: the shipped ones, with the campaign's laid over them. */
export function conditionDescriptionsFor(
  rules: ConditionRules | null,
  shipped: Record<string, string>,
): Record<string, string> {
  if (!rules) return shipped;
  const merged = { ...shipped };
  for (const { name, description } of rules.conditions) {
    if (description) merged[name] = description;
  }
  return merged;
}
