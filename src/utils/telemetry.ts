/**
 * What we ask PostHog to remember, and the one place that decides it.
 *
 * Two rules hold everything here together.
 *
 * **Counts and categories, never content.** No hero names, no monster names, no
 * battle names, no photos, no URLs with a query on them. "A fight started with
 * four heroes and six monsters" answers a product question; "Gerwin the Bold"
 * answers none and is somebody's character. Every event below is shaped so that
 * reading the whole stream tells you how the tracker is used and nothing about
 * who is at the table.
 *
 * **Typed at the call site.** Analytics rots when event names are strings typed
 * from memory: `battle_start` and `battle_started` become two half-populated
 * charts and nobody notices for a month. The map below is the schema — adding an
 * event means adding a line to it, and a typo is a build error.
 */

import type { PostHog } from "posthog-js";
import { DEVMODE } from "./devmode";
import { BUILD_ID, describeError, errorKey, type CaughtError } from "./errorReport";

/**
 * Whether anything is sent at all.
 *
 * Exported so utils/consent.ts can tell whether there is anything to switch on
 * or off, on the same condition rather than a restated one.
 */
export const ANALYTICS_ENABLED =
  !DEVMODE && !!import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

/* ------------------------------------------------------------------------ */
/* The client                                                                */
/* ------------------------------------------------------------------------ */

/*
 * posthog-js, loaded only once somebody has said yes.
 *
 * It used to be bundled and started on every page load, opted out until
 * consent. That kept it from capturing, but not from downloading, fetching its
 * remote config and extension bundles, and asking /flags with an anonymous
 * device id — all before the visitor had answered the banner. Now nothing of
 * PostHog's is loaded, and nothing goes to PostHog, until utils/consent.ts
 * calls startAnalytics.
 */
let client: PostHog | null = null;
let starting: Promise<PostHog | null> | null = null;

/* Calls made while posthog-js is still arriving, played in order once it has.
   Capped: past this a slow load drops events rather than holding them all. */
let waiting: ((ph: PostHog) => void)[] = [];
const MAX_WAITING = 100;

/* The latest context, person properties and identity. Kept whenever the app
   knows them, consent or not, and handed over when analytics starts — so
   somebody who says yes halfway through a session is described fully from
   then on, not just from the next page load. */
let context: Record<string, unknown> | null = null;
let person: PersonProperties = {};
let identity: string | null = null;

/** Run a call against the client: now if it is running, once it is if it is on its way. */
function withClient(call: (ph: PostHog) => void): void {
  if (client) {
    try {
      call(client);
    } catch {
      /* Analytics must never be the thing that breaks a page. */
    }
  } else if (starting && waiting.length < MAX_WAITING) {
    waiting.push(call);
  }
}

async function load(): Promise<PostHog | null> {
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
      /* Our own origin, not us.i.posthog.com — see functions/relay/[[path]].ts.
         PostHog's hostnames are on every mainstream blocklist, so a real share
         of events never left the browser and the numbers under-reported. */
      api_host: "/relay",
      /* Where the toolbar and "view in PostHog" links point. It is the app URL,
         which is NOT the ingestion host in VITE_PUBLIC_POSTHOG_HOST: with only
         a relative api_host set, those links would resolve against our own
         domain and 404. */
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      /* Started only once capturing is allowed, and the opt-in below is what
         switches it on — which also overrides an opt-out posthog-js may have
         remembered for itself. */
      opt_out_capturing_by_default: true,
      /* Nothing leaves without going past this. See scrubSecrets. */
      before_send: (event) => {
        if (!event?.properties) return event;
        for (const [key, value] of Object.entries(event.properties)) {
          if (typeof value === "string") event.properties[key] = scrubSecrets(value);
        }
        return event;
      },
    });
    posthog.opt_in_capturing();

    /* A console handle, on purpose. posthog is imported as an ES module, so
       unlike the old script-snippet install it never lands on `window` — and
       then there is no way to run `posthog.opt_out_capturing()` or
       `posthog.identify(...)` on the live site, or to check from the console
       whether analytics is even alive. That cost an hour of wrongly concluding
       nothing was being collected. It grants nobody anything new: the project
       key ships in the bundle already and is designed to be public. */
    (window as unknown as { posthog: PostHog }).posthog = posthog;

    if (context) posthog.register(context);
    if (Object.keys(person).length > 0) posthog.setPersonProperties(person);
    if (identity) posthog.identify(identity);

    client = posthog;
    const calls = waiting;
    waiting = [];
    for (const call of calls) withClient(call);
    return posthog;
  } catch {
    /* A blocked or failed download is not the page's problem. */
    waiting = [];
    return null;
  }
}

/**
 * Load and start analytics. Called by utils/consent.ts when capturing is
 * allowed, and never before; safe to call again.
 */
export function startAnalytics(): Promise<PostHog | null> {
  if (!ANALYTICS_ENABLED) return Promise.resolve(null);
  if (client) {
    /* Already running: this is a yes being said again, after a sign-out made
       posthog-js forget the last one (see resetIdentity). */
    try {
      client.opt_in_capturing();
    } catch {
      /* see withClient */
    }
    return Promise.resolve(client);
  }
  starting ??= load();
  return starting;
}

/**
 * Stop, and forget what PostHog kept about this browser. For a no — and for
 * somebody who has not answered, since an older version of the tracker ran
 * posthog-js before asking and may have left its identifiers behind.
 */
export function stopAnalytics(): void {
  waiting = [];
  if (client) {
    try {
      client.opt_out_capturing();
      /* Drops the stored distinct_id and person properties. Without this,
         declining stops new events but leaves the identifiers behind. */
      client.reset(true);
    } catch {
      /* see withClient */
    }
  }
  forgetStoredAnalytics();
}

/** Forget who this browser was identified as — a Patreon sign-out. */
export function resetIdentity(): void {
  identity = null;
  person = {};
  withClient((ph) => ph.reset());
}

/** posthog-js's own storage: its `ph_` keys and cookie, and its opt-in marker. */
function forgetStoredAnalytics(): void {
  const ours = (key: string) => key.startsWith("ph_") || key.startsWith("__ph_opt_in_out_");
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (const key of Object.keys(store)) if (ours(key)) store.removeItem(key);
    } catch {
      /* Storage refused: there is nothing in it to forget either. */
    }
  }
  /* The cookie is set on the site's parent domain as well as this host, so
     both have to be told it has expired. */
  const labels = window.location.hostname.split(".");
  const domains = labels.length > 1 ? labels.map((_, i) => labels.slice(i).join(".")).slice(0, -1) : [];
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0].trim();
    if (!name.startsWith("ph_")) continue;
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
  }
}

/**
 * The events, and what each one carries.
 *
 * Deliberately short. Every event here exists to answer a question somebody
 * actually has about the product; an event nobody would build a chart from is
 * noise that costs money and makes the useful ones harder to find.
 */
export interface EventMap {
  /** The fight began. The one funnel step everything else is measured against. */
  battle_started: {
    heroes: number;
    monsters: number;
    combatants: number;
    /**
     * Whether any monsters shared one initiative roll.
     *
     * This measures the group-initiative experiment in utils/experiments.ts —
     * eight goblins used to mean eight prompts — so there is a number behind
     * the decision to keep it or drop it.
     */
    grouped_initiative: boolean;
  };
  /**
   * The fight ended — cleared, or a new one started over it.
   *
   * The pair with `battle_started` is the question that matters most: of the
   * fights that start, how many are actually run to the end? A tracker people
   * abandon in round two is a different product problem from one nobody starts.
   */
  battle_ended: {
    rounds: number;
    combatants: number;
    /** How the fight finished: the button, or replaced by a new one. */
    ending: "cleared" | "replaced";
  };
  /** Which manager gets opened, and how often. Tells you what to invest in. */
  panel_opened: { panel: string };
  /** A condition was put on somebody. The name is ours, not the player's. */
  condition_applied: { condition: string };
  /** The Patreon prompt appeared, and what put it there. */
  supporter_prompt_shown: { reason: "first_visit" | "battle_manager" | "locked_wallpaper" };
  /** Somebody clicked through to Patreon from it. */
  supporter_prompt_clicked: { reason: "first_visit" | "battle_manager" | "locked_wallpaper" | "header" };
  /**
   * Storage is filling up. A real risk on this product — the whole battle lives
   * in localStorage and photos are stored beside it — and currently invisible.
   */
  storage_warning_shown: { megabytes: number };
  /** Something threw. Sent alongside captureException for funnel/segment use. */
  app_crashed: {
    where: string;
    source: string;
    error_name: string;
    /* Message, not stack: enough to group by, and it lands in a property that
       is easy to break down by in an insight. */
    error_message: string;
  };
}

/**
 * Query parameters that must never leave the browser.
 *
 * `code` is a Patreon OAuth authorization code. The redirect lands back on the
 * site as `/?code=<code>&state=<state>`, and PostHog's pageview capture puts
 * the whole href in `$current_url`. useSupporter does clear the query with
 * replaceState, but in an effect after React mounts, and nothing orders that
 * against PostHog's first pageview. When posthog-js started with the page, the
 * pageview came first every time, so the code went out in the clear on every
 * successful Patreon return.
 */
const SECRET_PARAMS = ["code", "state"];

/**
 * Remove those parameters from a URL-shaped string.
 *
 * Only those two, deliberately: utm campaign attribution is carried in the
 * query as well, and dropping the whole query string to fix this would quietly
 * break the one thing analytics is usually bought for.
 *
 * Anything that is not a URL comes back untouched, so this is safe to run over
 * every string property on every event — which is what `before_send` in load()
 * does.
 */
export function scrubSecrets(value: string): string {
  if (!SECRET_PARAMS.some((param) => value.includes(`${param}=`))) return value;
  try {
    const url = new URL(value);
    let touched = false;
    for (const param of SECRET_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        touched = true;
      }
    }
    return touched ? url.toString() : value;
  } catch {
    /* Not a URL after all — leave whatever it is alone. */
    return value;
  }
}

/**
 * Send an event.
 *
 * Never throws. Analytics is the least important thing on any code path it sits
 * on, and a `track()` that can take down a battle in progress is a bad trade at
 * any price — hence the swallow. It is also a no-op in dev, so a debugging
 * session does not write to the production project.
 */
export function track<K extends keyof EventMap>(name: K, properties: EventMap[K]): void {
  /* Nothing is sent from a dev server, so this is the only way to see what you
     just instrumented. Cheaper than reasoning about whether the call fired, and
     it keeps test events out of the real project. */
  if (import.meta.env.DEV) console.debug("[telemetry]", name, properties);
  if (!ANALYTICS_ENABLED) return;
  /* Before anybody has said yes this goes nowhere, which is the point. */
  withClient((ph) => ph.capture(name, properties));
}

/**
 * Facts true of every event, registered once.
 *
 * Device shape is here rather than on each event because the question it
 * answers — "does anybody actually run a fight from a phone?" — has to be
 * askable of *all* the other events, not just its own.
 */
export function registerContext(facts: {
  orientation: "portrait" | "landscape";
  wallpaper: string;
  /** Which motifs the paper carries — see constants/Wallpapers.ts. */
  paper_style: string;
  theme: string;
}): void {
  if (!ANALYTICS_ENABLED) return;
  const registered = { build_id: BUILD_ID, ...facts };
  context = registered;
  withClient((ph) => ph.register(registered));
}

/**
 * What we know about the person, as opposed to what they just did.
 *
 * Event properties describe one moment; person properties describe whoever is
 * sitting there, and every event they have ever sent gets filtered by them. It
 * is the difference between "this fight had six monsters" and "this DM is a
 * supporter" — the second is what lets you ask whether supporters run bigger
 * fights at all.
 */
export interface PersonProperties {
  /** Patreon supporter, as the client-side gate understands it. */
  is_supporter?: boolean;
  /** A name you gave a browser yourself. Only ever set by hand — see identifyPerson. */
  label?: string;
}

/**
 * Attach properties to whoever this browser already is.
 *
 * This is the one you want almost every time. It does NOT rename the person or
 * merge anything: PostHog minted an anonymous id on first visit and that stays
 * the primary key, which is exactly right for an app with no accounts.
 */
export function setPerson(properties: PersonProperties): void {
  if (import.meta.env.DEV) console.debug("[telemetry] person", properties);
  if (!ANALYTICS_ENABLED) return;
  person = { ...person, ...properties };
  withClient((ph) => ph.setPersonProperties(properties));
}

/**
 * Ids that must never become a person's primary key.
 *
 * The Patreon OAuth code is the trap this exists for. It is the closest thing
 * this app has to a user id, it is sitting right there in localStorage, and
 * reaching for it is the obvious move — but it is a credential. `before_send`
 * already strips it out of every URL on the way to PostHog; handing it to
 * identify() would put it back in as the person's primary key, in the clear,
 * where every event is filed under it forever.
 *
 * So this is a guard rather than a comment asking nicely.
 */
export function looksLikeACredential(id: string): boolean {
  try {
    if (id === window.localStorage.getItem("patreon_code")) return true;
  } catch {
    /* Storage can be refused outright; fall through to the shape test. */
  }
  /* Long, opaque, unpunctuated — the shape of a token. A UUID is exempt
     because that is what a legitimate anonymous id looks like, and a Patreon
     numeric user id is far too short to match. */
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return !isUuid && id.length >= 32 && /^[A-Za-z0-9_-]+$/.test(id);
}

/**
 * Say that this browser is a particular known person.
 *
 * Only worth calling when you have an id that is stable across devices, because
 * that is the single thing it buys: a DM on a laptop at home and a phone at the
 * table are two anonymous people until something tells PostHog they are one, and
 * until then the user count is inflated and retention is measuring the wrong
 * thing.
 *
 * Battle Tracker has no accounts, so today there are exactly two callers worth
 * having: claiming your own browser so you can filter yourself out of the
 * numbers, and the Patreon user id returned by the exchange in
 * functions/api/patreon/exchange.ts. The raw code is not that id, and
 * looksLikeACredential refuses it.
 *
 * Returns whether it was accepted, so a caller is told rather than guessing. An
 * accepted id reaches PostHog now if analytics is running, or as soon as it is.
 */
export function identifyPerson(id: string, properties: PersonProperties = {}): boolean {
  const trimmed = id.trim();
  if (!trimmed) return false;

  if (looksLikeACredential(trimmed)) {
    /* Loud on purpose. Silently ignoring this would look like it worked. */
    console.error(
      "[telemetry] refusing to identify by what looks like a credential. " +
        "See looksLikeACredential in utils/telemetry.ts.",
    );
    return false;
  }

  if (import.meta.env.DEV) console.debug("[telemetry] identify", trimmed, properties);
  if (!ANALYTICS_ENABLED) return false;
  identity = trimmed;
  person = { ...person, ...properties };
  withClient((ph) => ph.identify(trimmed, properties));
  return true;
}

/** Faults already sent this page load, so a render loop is not a thousand events. */
const reported = new Set<string>();

/**
 * Report a crash.
 *
 * Uses `captureException` so it lands in PostHog's error tracking — grouped into
 * issues with a parsed stack — rather than as a custom event nobody has built a
 * chart for. The plain `app_crashed` event goes out alongside it, because an
 * exception cannot be used as a funnel step and "how many sessions hit an error
 * before giving up" is a question worth being able to ask.
 *
 * Exception autocapture is deliberately *not* switched on: the boundaries and
 * the window listeners already see everything, they see it with the component
 * stack attached, and having both would double every report.
 */
export function reportCrash(caught: CaughtError): void {
  if (!ANALYTICS_ENABLED) return;
  try {
    const key = errorKey(caught);
    if (reported.has(key)) return;
    reported.add(key);

    const { name, message } = describeError(caught.error);
    const where = caught.where ?? "the whole page";

    /* captureException wants an Error, and people throw all sorts of things. */
    const error =
      caught.error instanceof Error ? caught.error : new Error(`${name}: ${message}`);

    withClient((ph) =>
      ph.captureException(error, {
        where,
        source: caught.source,
        build_id: BUILD_ID,
        component_stack: caught.componentStack?.slice(0, 2000),
      }),
    );

    track("app_crashed", {
      where,
      source: caught.source,
      error_name: name,
      error_message: message.slice(0, 300),
    });
  } catch {
    /* An error reporter that throws inside the error path is the worst of all
       possible bugs. Nothing here is allowed to escape. */
  }
}
