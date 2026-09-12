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

import posthog from "posthog-js";
import { DEVMODE } from "./devmode";
import { BUILD_ID, describeError, errorKey, type CaughtError } from "./errorReport";

/**
 * Whether anything is sent at all.
 *
 * Exported so main.tsx gates `posthog.init` on the same condition rather than
 * restating it — the two drifting apart would mean events queued against an
 * uninitialised client, which fails silently and is miserable to diagnose.
 */
export const ANALYTICS_ENABLED =
  !DEVMODE && !!import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

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
 * site as `/?code=<code>`, and PostHog's pageview capture puts the whole href
 * in `$current_url`. PatreonOverlay does clear the query with replaceState —
 * but that runs in an effect after React mounts, and `posthog.init` fires its
 * pageview before that, so the code was going out in the clear on every
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
 * every string property on every event — which is what main.tsx does.
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
  try {
    posthog.capture(name, properties);
  } catch {
    /* Deliberately silent. See above. */
  }
}

/**
 * Facts true of every event, registered once.
 *
 * Device shape is here rather than on each event because the question it
 * answers — "does anybody actually run a fight from a phone?" — has to be
 * askable of *all* the other events, not just its own.
 */
export function registerContext(context: {
  orientation: "portrait" | "landscape";
  wallpaper: string;
  /** Which motifs the paper carries — see constants/Wallpapers.ts. */
  paper_style: string;
  theme: string;
}): void {
  if (!ANALYTICS_ENABLED) return;
  try {
    posthog.register({ build_id: BUILD_ID, ...context });
  } catch {
    /* see track() */
  }
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
  try {
    posthog.setPersonProperties(properties);
  } catch {
    /* see track() */
  }
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
 * Returns whether it went through, so a caller is told rather than guessing.
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
  try {
    posthog.identify(trimmed, properties);
    return true;
  } catch {
    return false;
  }
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

    posthog.captureException(error, {
      where,
      source: caught.source,
      build_id: BUILD_ID,
      component_stack: caught.componentStack?.slice(0, 2000),
    });

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
