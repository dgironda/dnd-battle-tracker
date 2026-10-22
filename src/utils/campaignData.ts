import type { Combatant, Hero } from "../types/index";
import type { LogEntry } from "./battleLog";
import {
  cleanConditionRules,
  getCampaignConditionRules,
  storeCampaignConditionRules,
  type ConditionRule,
} from "./conditionRules";
import {
  campaignKey,
  getCampaignBattle,
  getCampaignBattleLog,
  getCampaignHeroes,
  getCampaignStamps,
  removeKey,
  setCampaignStamp,
  storeCampaignBattleLog,
  storeCampaignBattleSync,
  storeCampaignHeroes,
  writeKey,
} from "./LocalStorage";
import { fightPaper, type PlayerView } from "./playerView";
import { normalizeHero } from "./roster";

/**
 * A campaign's data as dmOS keeps it in step: three parts, party, fight and
 * rules, each with `at`, when it last changed here (0 for a campaign from
 * before anything was stamped; see the stamps in LocalStorage.ts).
 *
 * dmOS holds the real copy. BattleTracker's window inside dmOS works on this
 * one, and the bridge keeps the two in step part by part, the newer winning.
 * dmOS reads with getCampaignData and writes with putCampaignData. A put older
 * than what is here is refused and gets what is here back, so a slow write or
 * a second dmOS tab can't undo a newer change. A put keeps dmOS's `at`, so the
 * two sides agree how old each part is and never bounce one back and forth.
 *
 * One `at` per part was Davey's choice: newest wins outright, so if two
 * different heroes change on the two sides at the same moment, one edit loses.
 */

export interface PartyData {
  heroes: Hero[];
  at: number;
}

export interface FightData {
  combatants: Combatant[];
  round: number;
  /** Whose turn: a position in initiative order, as the tracker keeps it. */
  turnIndex: number;
  /** When the current turn began (epoch ms), or null before the first. */
  turnStartedAt: number | null;
  log: LogEntry[];
  at: number;
}

export interface RulesData {
  /** The campaign's own conditions, or null for the list BattleTracker ships. */
  conditions: ConditionRule[] | null;
  at: number;
}

export interface CampaignData {
  party: PartyData;
  fight: FightData;
  rules: RulesData;
}

/** What became of one part of a put. */
export type PutResult<T> = { applied: true } | { applied: false; current: T };

export interface PutResults {
  party?: PutResult<PartyData>;
  fight?: PutResult<FightData>;
  rules?: PutResult<RulesData>;
}

/* ------------------------------------------------------------------ reads */

function turnStart(campaignId: string): number | null {
  try {
    const at = Number(localStorage.getItem(campaignKey("turnStartedAt", campaignId)));
    return Number.isFinite(at) && at > 0 ? at : null;
  } catch {
    return null;
  }
}

function getParty(campaignId: string): PartyData {
  return {
    heroes: getCampaignHeroes(campaignId).map(normalizeHero),
    at: getCampaignStamps(campaignId).party,
  };
}

function getFight(campaignId: string): FightData {
  const { combatants, round, turnIndex } = getCampaignBattle(campaignId);
  return {
    combatants,
    round,
    turnIndex,
    turnStartedAt: turnStart(campaignId),
    log: getCampaignBattleLog(campaignId),
    at: getCampaignStamps(campaignId).fight,
  };
}

function getRules(campaignId: string): RulesData {
  return {
    conditions: getCampaignConditionRules(campaignId)?.conditions ?? null,
    at: getCampaignStamps(campaignId).rules,
  };
}

export function getCampaignData(campaignId: string): CampaignData {
  return { party: getParty(campaignId), fight: getFight(campaignId), rules: getRules(campaignId) };
}

/* --------------------------------------------------------- what dmOS sends */

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

function stampParam(value: unknown, part: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${part}.at must be a time in milliseconds.`);
  }
  return value;
}

function heroParam(value: unknown): Hero {
  if (!isFields(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    throw new Error("Each hero needs an id and a name.");
  }
  return normalizeHero(value as Partial<Hero> & { id: string; name: string });
}

/**
 * A combatant from dmOS. Checks what the tracker leans on (who it is, where it
 * stands in the order, its hit points and conditions) and keeps the rest as
 * sent, since dmOS had the combatant from BattleTracker to begin with.
 */
function combatantParam(value: unknown): Combatant {
  const ok =
    isFields(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.type === "hero" || value.type === "monster") &&
    [value.initiative, value.currHp, value.maxHp].every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Array.isArray(value.conditions) &&
    value.conditions.every((c) => typeof c === "string");
  if (!ok) {
    throw new Error("Each combatant needs an id, a name, a type, initiative, hit points and a list of conditions.");
  }
  return value as unknown as Combatant;
}

function combatantsParam(value: unknown): Combatant[] {
  if (!Array.isArray(value)) throw new Error("combatants must be a list.");
  return value.map(combatantParam);
}

function logParam(value: unknown): LogEntry[] {
  const ok =
    Array.isArray(value) &&
    value.every((e) => isFields(e) && typeof e.id === "string" && typeof e.at === "number");
  if (!ok) throw new Error("fight.log must be a list of log entries.");
  return value as LogEntry[];
}

function partyParam(value: unknown): PartyData {
  if (!isFields(value) || !Array.isArray(value.heroes)) throw new Error("party.heroes must be a list.");
  return { heroes: value.heroes.map(heroParam), at: stampParam(value.at, "party") };
}

function fightParam(value: unknown): FightData {
  if (!isFields(value)) throw new Error("fight must be an object.");
  if (!isCount(value.round) || !isCount(value.turnIndex)) {
    throw new Error("fight.round and fight.turnIndex must be whole numbers.");
  }
  const startedAt = value.turnStartedAt;
  if (startedAt !== null && !(typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt > 0)) {
    throw new Error("fight.turnStartedAt must be a time in milliseconds, or null.");
  }
  return {
    combatants: combatantsParam(value.combatants),
    round: value.round,
    turnIndex: value.turnIndex,
    turnStartedAt: startedAt,
    log: logParam(value.log),
    at: stampParam(value.at, "fight"),
  };
}

function rulesParam(value: unknown): RulesData {
  if (!isFields(value)) throw new Error("rules must be an object.");
  let conditions: ConditionRule[] | null = null;
  if (value.conditions !== null) {
    const clean = cleanConditionRules({ conditions: value.conditions });
    if (!clean) throw new Error("rules.conditions must be a list of conditions, or null.");
    conditions = clean.conditions;
  }
  return { conditions, at: stampParam(value.at, "rules") };
}

/* ----------------------------------------------------------------- writes */

/* Each writes the part, which stamps it as changed now, then sets the stamp
   to dmOS's own time for it. */

function applyParty(campaignId: string, party: PartyData): void {
  storeCampaignHeroes(campaignId, party.heroes);
  setCampaignStamp(campaignId, "party", party.at);
}

function applyFight(campaignId: string, fight: FightData): void {
  writeKey(campaignKey("storedCombatants", campaignId), JSON.stringify(fight.combatants));
  writeKey(campaignKey("roundNumber", campaignId), String(fight.round));
  writeKey(campaignKey("currentTurnIndex", campaignId), String(fight.turnIndex));
  if (fight.turnStartedAt === null) removeKey(campaignKey("turnStartedAt", campaignId));
  else writeKey(campaignKey("turnStartedAt", campaignId), String(fight.turnStartedAt));
  storeCampaignBattleLog(campaignId, fight.log);
  setCampaignStamp(campaignId, "fight", fight.at);
  /* Last, so an open tracker takes the whole fight at once (see BattleSync). */
  storeCampaignBattleSync(campaignId);
}

function applyRules(campaignId: string, rules: RulesData): void {
  storeCampaignConditionRules(campaignId, rules.conditions ? { conditions: rules.conditions } : null);
  setCampaignStamp(campaignId, "rules", rules.at);
}

/** How to read and write one part. */
interface PartRule<T extends { at: number }> {
  read: (campaignId: string) => T;
  apply: (campaignId: string, value: T) => void;
}

const PARTY: PartRule<PartyData> = { read: getParty, apply: applyParty };
const FIGHT: PartRule<FightData> = { read: getFight, apply: applyFight };
const RULES: PartRule<RulesData> = { read: getRules, apply: applyRules };

/** One part of a put: written if it is at least as new as this copy's, refused otherwise. */
function settle<T extends { at: number }>(campaignId: string, rule: PartRule<T>, value: T, here: number): PutResult<T> {
  if (value.at < here) return { applied: false, current: rule.read(campaignId) };
  rule.apply(campaignId, value);
  return { applied: true };
}

const optional = <T>(value: unknown, parse: (value: unknown) => T): T | undefined =>
  value === undefined ? undefined : parse(value);

/**
 * Write dmOS's copy of whichever parts it sends. Every part is checked before
 * any is written, so a bad one can't leave half a put behind. A part whose
 * `at` is older than this copy's is not written; its result carries this
 * copy's part instead.
 */
export function putCampaignData(campaignId: string, params: Fields): PutResults {
  const party = optional(params.party, partyParam);
  const fight = optional(params.fight, fightParam);
  const rules = optional(params.rules, rulesParam);
  if ([party, fight, rules].every((part) => part === undefined)) {
    throw new Error("Send at least one of party, fight or rules.");
  }

  const here = getCampaignStamps(campaignId);
  const results: PutResults = {};
  if (party) results.party = settle(campaignId, PARTY, party, here.party);
  if (fight) results.fight = settle(campaignId, FIGHT, fight, here.fight);
  if (rules) results.rules = settle(campaignId, RULES, rules, here.rules);
  return results;
}

/**
 * The initiative paper for a fight dmOS hands over, by Battle Link's own rule
 * for what players may see: hidden monsters left off, hit points as bands.
 */
export function toFightPaper(params: Fields): PlayerView {
  if (!isCount(params.round) || !isCount(params.turnIndex)) {
    throw new Error("round and turnIndex must be whole numbers.");
  }
  return fightPaper(combatantsParam(params.combatants), params.round, params.turnIndex);
}
