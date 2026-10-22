/**
 * The dmOS bridge: bridge.html, loaded by dmOS in a hidden frame.
 *
 * dmOS runs on its own origin, so it can't read BattleTracker's storage. It
 * asks this page instead, which runs on BattleTracker's origin and so reads
 * and writes BattleTracker's copy.
 *
 * dmOS holds the real copy of each campaign's party, fight and rules, and
 * carries everything between BattleTracker and players' sheets.
 * BattleTracker's window inside dmOS works on its own copy, kept in step from
 * here: getCampaignData and putCampaignData move a whole part (party, fight or
 * rules) each way, and each part carries `at`, when it last changed. Newest
 * wins, and a put older than what is here is refused. See utils/campaignData.ts.
 *
 * Messages are plain objects tagged `dmos: 1`:
 *   dmOS -> bridge  { dmos: 1, id, method, params }
 *   bridge -> dmOS  { dmos: 1, id, result } or { dmos: 1, id, error }
 *   bridge -> dmOS  { dmos: 1, event: "heroesChanged" | "battleChanged" | "rulesChanged", campaignId, at }
 *   bridge -> dmOS  { dmos: 1, event: "monstersChanged" }
 *
 * The initiative paper players see is worked out here, by Battle Link's own
 * rule, from a fight dmOS hands over (toFightPaper); dmOS sends it on to the
 * sheets. What players may see stays decided in one place.
 *
 * Damage from dmOS (jFight) goes through resolveDamage, the same rule the
 * tracker's own HP window uses, and is written to the battle log the same
 * way, so a hit from jFight is indistinguishable from one typed in here.
 *
 * The bestiaries (2014 and 2024) are the same files the Monster Manager
 * searches, served to dmOS whole so it can browse them; a monster added from
 * dmOS lands in the library named by the Monster Manager's rule
 * (planMonsterNames), ready for the next battle.
 *
 * dmOS is for Patreon supporters, and this is where that's enforced: every
 * method but hello and getSupporter is refused unless BattleTracker's own
 * server says this browser's Patreon session is a supporter's (the signed
 * session cookie, sent because dmOS is same-site). dmOS shows its own gate
 * from getSupporter; this makes sure the data stays behind it.
 *
 * The open BattleTracker app needs no telling: it already reloads its roster
 * on the `storage` event these writes fire (hooks/rosterContext.tsx), and
 * reloads itself when the active campaign changes (reloadOnCampaignSwitch).
 */

import { READIED_CONDITION } from "./constants/Conditions";
import type { Attack, Hero, Monster } from "./types/index";
import { appendEntry, makeEntry, type LogEntry } from "./utils/battleLog";
import { resolveDamage } from "./utils/damage";
import {
  cleanConditionRules,
  getCampaignConditionRules,
  storeCampaignConditionRules,
} from "./utils/conditionRules";
import { getCustomConditions } from "./utils/customConditions";
import {
  conditionDescriptionsTwentyFourteen,
  conditionDescriptionsTwentyTwentyFour,
  conditionOptions,
} from "./constants/Conditions";
import { isAllowedOrigin } from "./utils/dmos";
import { getCampaignData, putCampaignData, toFightPaper } from "./utils/campaignData";
import { statBlockLink } from "./utils/links";
import {
  campaignKey,
  clearCampaign,
  DEFAULT_CAMPAIGN_ID,
  getCampaignBattle,
  getCampaignBattleLog,
  getCampaignHeroes,
  getCampaignStamps,
  getMonsterAttacks,
  getMonsters,
  isCampaignId,
  MONSTER_ATTACKS_KEY,
  monsterKind,
  readActiveCampaign,
  STORAGE_KEYS,
  storeActiveCampaign,
  storeCampaignBattleLog,
  storeCampaignBattleSync,
  storeCampaignCombatants,
  storeCampaignHeroes,
  storeCampaignTurn,
  storeMonsterAttacks,
  storeMonsters,
  type CampaignPart,
} from "./utils/LocalStorage";
import { planMonsterNames } from "./utils/monsterNaming";
import { fetchSupporterState, type SupporterState } from "./utils/patreonSession";
import { normalizeHero } from "./utils/roster";
import { byInitiative, nextTurn, passTurn } from "./utils/turnOrder";

/**
 * Bumped when a method changes shape, so dmOS can tell what it's talking to.
 * 9: getCampaignData, putCampaignData, toFightPaper, and `at` on the change
 * events. (8, never released, handed out a Battle Link URL instead.)
 */
export const BRIDGE_VERSION = 9;

/** Open to everyone, so dmOS can tell a stranger what it is. */
const OPEN_METHODS = new Set(["hello", "getSupporter"]);

const NOT_A_SUPPORTER = "dmOS is for Simulacrum Technologies patrons. Sign in with Patreon to use it.";

let supporter: Promise<SupporterState> | null = null;

/** What the server says about this browser: asked once per page, and afresh by getSupporter. */
function supporterState(fresh = false): Promise<SupporterState> {
  if (fresh || !supporter) supporter = fetchSupporterState();
  return supporter;
}

const isSupporter = async () => (await supporterState()).isSupporter;

type Params = Record<string, unknown>;

function campaignParam(params: Params): string {
  const id = params.campaignId;
  if (!isCampaignId(id)) throw new Error("A valid campaignId is required.");
  return id;
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

/** Attacks as dmOS sent them, cut down to the fields an Attack has. */
export function cleanAttacks(value: unknown): Attack[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((a) => {
    if (!a || typeof a !== "object" || typeof a.id !== "string" || !a.id) return [];
    const toHit = Number(a.toHit);
    const damage: unknown[] = Array.isArray(a.damage) ? a.damage : [];
    return [{
      id: a.id.slice(0, 64),
      name: text(a.name, 60),
      toHit: Number.isFinite(toHit) ? Math.trunc(toHit) : 0,
      damage: damage.slice(0, 6).map((d) => {
        const part = (d ?? {}) as Record<string, unknown>;
        return { dice: text(part.dice, 40), type: text(part.type, 30) };
      }),
    }];
  });
}

/** A whole number in [min, max], or `fallback` if it isn't a number at all. */
function whole(value: unknown, fallback: number, min: number, max: number): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

type Edition = "2014" | "2024";

/* Loaded on demand, as the Monster Manager does: the 2014 list alone is half
   a megabyte. Vite shares the chunks between the two. */
const BESTIARIES: Record<Edition, () => Promise<{ default: unknown }>> = {
  "2014": () => import("./assets/2014monsters.json"),
  "2024": () => import("./assets/2024monsters.json"),
};

/** The edition BattleTracker's own settings are set to (the 2014/2024 switch). */
function settingsEdition(): Edition {
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "{}");
    return settings?.version === "twentyTwentyFour" ? "2024" : "2014";
  } catch {
    return "2014";
  }
}

/** A bestiary entry as dmOS sent it back, made into a fresh library monster. */
function monsterParam(params: Params): Omit<Monster, "id"> {
  const m = (params.monster ?? {}) as Record<string, unknown>;
  const name = text(m.name, 80).trim();
  if (!name) throw new Error("A monster needs a name.");
  const hp = whole(m.hp, 1, 0, 9999);
  const ability = (value: unknown) => whole(value, 10, 1, 30);
  return {
    name,
    link: statBlockLink(m.link),
    hp,
    maxHp: hp,
    currHp: hp,
    ac: whole(m.ac, 10, 0, 50),
    str: ability(m.str),
    dex: ability(m.dex),
    con: ability(m.con),
    int: ability(m.int),
    wis: ability(m.wis),
    cha: ability(m.cha),
    pp: whole(m.pp, 10, 0, 50),
    init: whole(m.init, 0, -10, 30),
    hidden: false,
    // Ready for the next battle, as one added in the Monster Manager is.
    present: true,
    conditions: [],
  };
}

function heroParam(params: Params): Hero {
  const hero = params.hero as Partial<Hero> | undefined;
  if (!hero || typeof hero.id !== "string" || !hero.id || typeof hero.name !== "string") {
    throw new Error("A hero needs an id and a name.");
  }
  const normal = normalizeHero(hero as Partial<Hero> & { id: string; name: string });
  return { ...normal, class: text(hero.class, 30) || undefined, attacks: cleanAttacks(hero.attacks) };
}

const METHODS: Record<string, (params: Params) => unknown> = {
  hello: () => ({ version: BRIDGE_VERSION, activeCampaign: readActiveCampaign() }),

  /**
   * Whether this browser may use dmOS: signed in with Patreon, with a pledge.
   * `available` is false when the server can't check at all, which is not the
   * same as "no" (see patreonSession). Asks the server afresh.
   */
  getSupporter: async () => {
    const state = await supporterState(true);
    return { isSupporter: state.isSupporter, signedIn: state.personId !== null, available: state.available };
  },

  getHeroes: (params) => getCampaignHeroes(campaignParam(params)).map(normalizeHero),

  /** Add the hero, or replace the one with the same id. Returns the roster. */
  saveHero: (params) => {
    const campaignId = campaignParam(params);
    const hero = heroParam(params);
    const heroes = getCampaignHeroes(campaignId);
    const at = heroes.findIndex((h) => h.id === hero.id);
    if (at === -1) heroes.push(hero);
    else heroes[at] = hero;
    storeCampaignHeroes(campaignId, heroes);
    return heroes.map(normalizeHero);
  },

  deleteHero: (params) => {
    const campaignId = campaignParam(params);
    const heroes = getCampaignHeroes(campaignId).filter((h) => h.id !== params.heroId);
    storeCampaignHeroes(campaignId, heroes);
    return heroes.map(normalizeHero);
  },

  setActiveCampaign: (params) => {
    const id = campaignParam({ campaignId: params.id });
    const name = typeof params.name === "string" && params.name.trim() ? params.name.trim() : id;
    storeActiveCampaign({ id, name });
    return null;
  },

  /** The fight in progress: everyone in it, the round, and whose turn it is. */
  getBattle: (params) => getCampaignBattle(campaignParam(params)),

  /**
   * BattleTracker's copy of the campaign: `{ party, fight, rules }`, each part
   * with `at`, when it last changed here (0 if that was never recorded).
   */
  getCampaignData: (params) => getCampaignData(campaignParam(params)),

  /**
   * dmOS's copy of any of the three parts, written here keeping dmOS's `at`.
   * A part older than BattleTracker's is refused and comes back as `current`.
   */
  putCampaignData: (params) => putCampaignData(campaignParam(params), params),

  /**
   * The initiative paper for a fight dmOS hands over: Battle Link's view of
   * it, by Battle Link's own rule for what players may see.
   */
  toFightPaper: (params) => toFightPaper(params),

  /**
   * Hit a combatant for `amount`, temp HP first, exactly as the tracker's HP
   * window would, and log it. `note` says what did it ("Longsword, slashing,
   * from Kessa"). Returns the combatant as they now stand.
   */
  applyDamage: (params) => {
    const campaignId = campaignParam(params);
    const amount = Math.trunc(Number(params.amount));
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Damage must be a whole number, 0 or more.");
    const battle = getCampaignBattle(campaignId);
    const target = battle.combatants.find((c) => c.id === params.targetId);
    if (!target) throw new Error("That combatant isn't in the battle.");

    const result = resolveDamage(amount, target.currHp, target.tHp, target.conditions, target.type);
    const updated = { ...target, currHp: result.newHp, tHp: result.newtHp, conditions: result.conditions };
    storeCampaignCombatants(campaignId, battle.combatants.map((c) => (c.id === target.id ? updated : c)));

    let log: LogEntry[] = getCampaignBattleLog(campaignId);
    const note = text(params.note, 120) || undefined;
    const add = (...entry: Parameters<typeof makeEntry>) => {
      log = appendEntry(log, makeEntry(...entry));
    };
    if (result.newHp < target.currHp) {
      add("damage", target.name, battle.round, {
        amount: target.currHp - result.newHp,
        from: target.currHp,
        to: result.newHp,
        detail: note,
      });
    }
    if (result.newtHp !== target.tHp) add("temp-hp", target.name, battle.round, { amount: result.newtHp });
    if (target.currHp > 0 && result.newHp <= 0) add("down", target.name, battle.round);
    storeCampaignBattleLog(campaignId, log);
    storeCampaignBattleSync(campaignId);
    return updated;
  },

  /**
   * Set a combatant's hit points and temporary hit points outright, as a
   * player marks them on a sheet linked through dmOS, and log what that was,
   * the way the tracker's HP window does (useCombatantEdits' logHpChange):
   * damage or healing, temp HP, going down or coming back. `note` says where
   * it came from. Conditions are left alone. Returns the combatant as they
   * now stand.
   */
  setVitals: (params) => {
    const campaignId = campaignParam(params);
    const battle = getCampaignBattle(campaignId);
    const target = battle.combatants.find((c) => c.id === params.targetId);
    if (!target) throw new Error("That combatant isn't in the battle.");
    const currHp = whole(params.currHp, target.currHp, 0, Math.max(target.maxHp, target.currHp));
    const tHp = whole(params.tHp, target.tHp, 0, 999);
    if (currHp === target.currHp && tHp === target.tHp) return target;

    const updated = { ...target, currHp, tHp };
    storeCampaignCombatants(campaignId, battle.combatants.map((c) => (c.id === target.id ? updated : c)));

    let log: LogEntry[] = getCampaignBattleLog(campaignId);
    const detail = text(params.note, 120) || undefined;
    const add = (...entry: Parameters<typeof makeEntry>) => {
      log = appendEntry(log, makeEntry(...entry));
    };
    const moved = { amount: Math.abs(currHp - target.currHp), from: target.currHp, to: currHp, detail };
    if (currHp < target.currHp) add("damage", target.name, battle.round, moved);
    else if (currHp > target.currHp) add("heal", target.name, battle.round, moved);
    if (tHp !== target.tHp) add("temp-hp", target.name, battle.round, { amount: tHp });
    if (target.currHp > 0 && currHp <= 0) add("down", target.name, battle.round);
    else if (target.currHp <= 0 && currHp > 0) add("revived", target.name, battle.round);
    storeCampaignBattleLog(campaignId, log);
    storeCampaignBattleSync(campaignId);
    return updated;
  },

  /**
   * End the acting combatant's turn as ticking Action, Bonus and Move would:
   * mark them done and pass the turn on by the tracker's own rule (nextTurn,
   * passTurn), logging a new round and any readied action that lapses.
   * Returns the battle as it now stands.
   */
  endTurn: (params) => {
    const campaignId = campaignParam(params);
    const battle = getCampaignBattle(campaignId);
    const sorted = [...battle.combatants].sort(byInitiative);
    if (!sorted.length) throw new Error("There's no battle in progress.");
    const current = Math.min(battle.turnIndex, sorted.length - 1);
    const acted = sorted.map((c, i) => (i === current ? { ...c, action: true, bonus: true, move: true } : c));
    const turn = nextTurn(acted, current);
    if (!turn) throw new Error("Everyone in the battle is dead.");

    const starting = acted[turn.index];
    const round = turn.isNewRound ? battle.round + 1 : battle.round;
    let log: LogEntry[] = getCampaignBattleLog(campaignId);
    if (turn.isNewRound) log = appendEntry(log, makeEntry("round", "", round));
    if (starting.conditions.includes(READIED_CONDITION)) {
      log = appendEntry(log, makeEntry("condition-off", starting.name, round, { detail: READIED_CONDITION }));
    }
    const combatants = passTurn(acted, starting.id, turn.isNewRound);
    storeCampaignTurn(campaignId, { combatants, round, turnIndex: turn.index, startedAt: Date.now() });
    storeCampaignBattleLog(campaignId, log);
    storeCampaignBattleSync(campaignId);
    return { combatants, round, turnIndex: turn.index };
  },

  /** The monster library (shared by every campaign). */
  getMonsters: () => getMonsters(),

  /**
   * One edition's bestiary, every entry: `edition` is "2014" or "2024", or
   * left out for the one BattleTracker's settings use. Returns which it sent.
   */
  getBestiary: async (params) => {
    const edition: Edition = params.edition === "2014" || params.edition === "2024" ? params.edition : settingsEdition();
    const monsters = (await BESTIARIES[edition]()).default;
    return { edition, settingsEdition: settingsEdition(), monsters };
  },

  /**
   * Add `count` of a monster to the library, numbered as the Monster Manager
   * numbers them (a second Goblin makes the first "Goblin 1"). Returns the
   * library and the names given to the new ones.
   */
  addMonsters: (params) => {
    const monster = monsterParam(params);
    const library = getMonsters();
    const plan = planMonsterNames(library.map((m) => m.name), monster.name, whole(params.count, 1, 1, 50));
    const renamed = library.map((m) =>
      plan.renameFrom !== null && m.name === plan.renameFrom ? { ...m, name: plan.renameTo as string } : m,
    );
    const added = plan.newNames.map((name) => ({ ...monster, id: crypto.randomUUID(), name }));
    storeMonsters([...renamed, ...added]);
    return { monsters: [...renamed, ...added], added: plan.newNames };
  },

  /**
   * The conditions we ship, in the picker's order, with both editions'
   * descriptions, and the names the DM has typed in: what dmOS's Rules
   * Manager starts a campaign's list from.
   */
  getConditionDefaults: () => ({
    conditions: conditionOptions,
    descriptions: { "2014": conditionDescriptionsTwentyFourteen, "2024": conditionDescriptionsTwentyTwentyFour },
    edition: settingsEdition(),
    typed: getCustomConditions(),
  }),

  /** A campaign's own conditions, or null while it uses what we ship. */
  getConditionRules: (params) => getCampaignConditionRules(campaignParam(params)),

  /**
   * Set a campaign's conditions (`rules: { conditions: [{ name, description }] }`),
   * or with `rules: null` go back to what we ship. Returns what was stored.
   */
  setConditionRules: (params) => {
    const campaignId = campaignParam(params);
    if (params.rules === null) {
      storeCampaignConditionRules(campaignId, null);
      return null;
    }
    const rules = cleanConditionRules(params.rules);
    if (!rules) throw new Error("Condition rules need a list of conditions.");
    storeCampaignConditionRules(campaignId, rules);
    return rules;
  },

  /** Saved attacks for every kind of monster, keyed by kind ("goblin"). */
  getMonsterAttacks: () => getMonsterAttacks(),

  saveMonsterAttacks: (params) => {
    const kind = monsterKind(text(params.kind, 60));
    if (!kind) throw new Error("A monster kind is required.");
    const all = getMonsterAttacks();
    const attacks = cleanAttacks(params.attacks);
    if (attacks.length) all[kind] = attacks;
    else delete all[kind];
    storeMonsterAttacks(all);
    return all;
  },

  deleteCampaign: (params) => {
    const campaignId = campaignParam(params);
    if (campaignId === DEFAULT_CAMPAIGN_ID) throw new Error("The default campaign can't be deleted.");
    clearCampaign(campaignId);
    return null;
  },
};

/** Run one request. Exported for the tests; the page wires it to `message`. */
export function handleRequest(method: unknown, params: unknown): { result: unknown } | { error: string } {
  const run = typeof method === "string" ? METHODS[method] : undefined;
  if (!run) return { error: `Unknown method ${String(method)}.` };
  try {
    return { result: run((params ?? {}) as Params) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Run one request from dmOS, waiting for it if it answers later
 * (getBestiary), and only for a supporter unless it's one of the open ones.
 * `allowed` is the supporter check; the tests stand it in.
 */
export async function answer(
  method: unknown,
  params: unknown,
  allowed: () => Promise<boolean> = isSupporter,
): Promise<{ result: unknown } | { error: string }> {
  if (!OPEN_METHODS.has(String(method)) && !(await allowed())) return { error: NOT_A_SUPPORTER };
  const reply = handleRequest(method, params);
  if (!("result" in reply) || !(reply.result instanceof Promise)) return reply;
  try {
    return { result: await reply.result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** Which campaign a storage key holds `baseKey` for, or null if it isn't that key. */
export function keyCampaign(key: string | null, baseKey: string): string | null {
  if (key === campaignKey(baseKey, DEFAULT_CAMPAIGN_ID)) return DEFAULT_CAMPAIGN_ID;
  const match = key?.match(/^campaign:([a-z0-9-]+):(.+)$/);
  return match && match[2] === baseKey ? match[1] : null;
}

/** The keys that make up a fight, by their unprefixed names. */
const BATTLE_KEYS = ["storedCombatants", "roundNumber", "currentTurnIndex", "battleLog"];

/**
 * What a change to `key` means to dmOS, if anything. A change to a campaign's
 * party, fight or rules carries that part's `at`, so dmOS can tell whether
 * BattleTracker's copy is now the newer one without asking for it.
 */
export function eventFor(key: string | null): { event: string; campaignId?: string; at?: number } | null {
  const heroes = keyCampaign(key, "storedHeroes");
  if (heroes) return { event: "heroesChanged", campaignId: heroes, at: getCampaignStamps(heroes).party };
  for (const base of BATTLE_KEYS) {
    const battle = keyCampaign(key, base);
    if (battle) return { event: "battleChanged", campaignId: battle, at: getCampaignStamps(battle).fight };
  }
  const rules = keyCampaign(key, "conditionRules");
  if (rules) return { event: "rulesChanged", campaignId: rules, at: getCampaignStamps(rules).rules };
  if (key === MONSTER_ATTACKS_KEY || key === STORAGE_KEYS.monsters) return { event: "monstersChanged" };
  return null;
}

/** Which part each campaign event is about. */
const PART_OF_EVENT: Record<string, CampaignPart> = {
  heroesChanged: "party",
  battleChanged: "fight",
  rulesChanged: "rules",
};

/** How long to wait for the rest of a burst of writes before telling dmOS. */
const SETTLE_MS = 50;

/**
 * Report changes made in BattleTracker itself (its window, or another tab) to
 * dmOS, a burst at a time.
 *
 * One change in the tracker writes several keys: a turn writes the combatants,
 * the round and whose turn it is, and each is stamped as it goes. This page
 * hears of them one storage event at a time, and sees each key's new value only
 * when that key's own event arrives. Reported at the first event, dmOS was
 * told the stamp from before the change, and would have read a fight only half
 * written. So a campaign's changes are gathered, and each part is reported
 * once, a moment after the last write, with its stamp as it then stands.
 *
 * Exported for the tests, which hand it keys the way the storage event would.
 */
export function changeReporter(
  post: (change: { event: string; campaignId?: string; at?: number }) => void,
  settleMs = SETTLE_MS,
): (key: string | null) => void {
  const pending = new Map<string, { event: string; campaignId: string }>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    for (const { event, campaignId } of pending.values()) {
      post({ event, campaignId, at: getCampaignStamps(campaignId)[PART_OF_EVENT[event]] });
    }
    pending.clear();
  };

  return (key) => {
    const change = eventFor(key);
    if (change && !change.campaignId) {
      // The monster library: one key, nothing to wait for.
      post(change);
      return;
    }
    if (change?.campaignId) {
      pending.set(`${change.event} ${change.campaignId}`, { event: change.event, campaignId: change.campaignId });
    } else if (!pending.size) {
      return;
    }
    // Anything that arrives while a report waits (the stamps themselves, the
    // next key of the fight) is more of the same burst.
    clearTimeout(timer);
    timer = setTimeout(flush, settleMs);
  };
}

function start(): void {
  // Only meaningful inside dmOS's frame; opened on its own it does nothing.
  if (window.parent === window) return;
  let dmosOrigin: string | null = null;

  window.addEventListener("message", (e: MessageEvent) => {
    if (e.source !== window.parent || !isAllowedOrigin(e.origin, import.meta.env.DEV)) return;
    const msg = e.data as { dmos?: unknown; id?: unknown; method?: unknown; params?: unknown };
    if (msg?.dmos !== 1 || typeof msg.id !== "number") return;
    dmosOrigin = e.origin;
    const id = msg.id;
    void answer(msg.method, msg.params).then((reply) => window.parent.postMessage({ dmos: 1, id, ...reply }, e.origin));
  });

  // Edits made in BattleTracker itself (another tab, or its window in dmOS).
  const report = changeReporter((change) => {
    if (dmosOrigin) window.parent.postMessage({ dmos: 1, ...change }, dmosOrigin);
  });
  window.addEventListener("storage", (e) => report(e.key));
}

if (typeof window !== "undefined") start();
