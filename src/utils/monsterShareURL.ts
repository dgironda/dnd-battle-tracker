import { getMonsters, storeMonsters } from "./LocalStorage";
import { notify, confirmDialog, promptDialog } from "./notify";
import {
  ENCOUNTER_PARAM,
  LEGACY_MONSTERS_PARAM,
  MAX_ENCOUNTER_NAME,
  buildEncounterUrl,
  parseEncounterParam,
  parseLegacyMonstersParam,
  type Encounter,
} from "./encounterShare";
import type { Monster } from "../types";

const MAX_STORED_MONSTERS = 1000;

/**
 * Sharing an encounter, and receiving one.
 *
 * See encounterShare.ts for what an encounter is and why it carries only
 * monsters. This file is the part that talks to the user: naming the thing,
 * putting the link on the clipboard, and asking before dropping a stranger's
 * monsters into their roster.
 */

/**
 * Copy a link for a set of monsters, after asking what to call it.
 *
 * The name rides in the payload so the other end can say "Goblin Ambush —
 * 6 monsters" rather than "someone sent you 6 monsters", and so the sender has
 * something to write in the hyperlink text.
 */
export async function shareEncounter(
  monsters: Monster[],
  options: { suggestedName?: string } = {},
): Promise<string | null> {
  if (!monsters || monsters.length === 0) {
    await notify("There are no monsters to share.", { title: "Nothing to share" });
    return null;
  }

  const name = await promptDialog("What do you want to call this encounter?", {
    title: "Share encounter",
    placeholder: "Goblin Ambush",
    initial: options.suggestedName ?? "",
    maxLength: MAX_ENCOUNTER_NAME,
    confirmLabel: "Copy link",
  });
  if (name === null) return null; // dismissed

  const encounter: Encounter = { name, monsters };
  const base = window.location.origin + window.location.pathname;
  const { url, tooLong, length } = buildEncounterUrl(encounter, base);

  if (tooLong) {
    await notify(
      `"${name}" is too big for one link — ${monsters.length} monsters comes to ${length.toLocaleString()} characters. ` +
        `Share fewer at a time, or send a file with Download everything.`,
      { title: "Link too long", tone: "warning" },
    );
    return null;
  }

  try {
    await navigator.clipboard.writeText(url);
    await notify(
      `A link to "${name}" (${monsters.length} monster${monsters.length === 1 ? "" : "s"}) is on your clipboard. ` +
        `Paste it anywhere — put it behind the words "${name}" if you want it tidy.`,
      { title: "Link copied" },
    );
  } catch {
    await notify(
      "Couldn't reach the clipboard, so the link is in the address bar instead — copy it from there.",
      { title: "Copy failed", tone: "warning" },
    );
    window.history.replaceState({}, document.title, url);
  }

  return url;
}

/**
 * On load, take an encounter out of the URL and offer it.
 *
 * Asks first. An encounter arrives from someone else's link, and dropping a
 * stranger's monsters into the roster unannounced is not a thing to do quietly
 * — especially as the roster is what the Monster Manager shows and what the
 * next battle draws from.
 */
export async function loadEncounterFromURL(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(ENCOUNTER_PARAM);
  const legacy = params.get(LEGACY_MONSTERS_PARAM);
  if (!encoded && !legacy) return;

  // Cleared up front so a bad payload cannot be re-run by reloading.
  window.history.replaceState({}, document.title, window.location.pathname);

  const encounter = encoded
    ? parseEncounterParam(encoded)
    : parseLegacyMonstersParam(legacy as string);

  if (!encounter) {
    await notify("That share link couldn't be read.", { title: "Invalid link", tone: "warning" });
    return;
  }

  const count = encounter.monsters.length;
  const label = encounter.name ? `"${encounter.name}"` : "This encounter";
  const ok = await confirmDialog(
    `${label} has ${count} monster${count === 1 ? "" : "s"}. Add ${count === 1 ? "it" : "them"} to your Monster Manager?`,
    { title: "Encounter shared with you", tone: "info", confirmLabel: "Add to roster" },
  );
  if (!ok) return;

  const existing = getMonsters() ?? [];
  // Ids are minted fresh on the way in (see encounterShare), so there is
  // nothing to collide with — but the roster still has a ceiling.
  const merged = [...existing, ...encounter.monsters];
  if (merged.length > MAX_STORED_MONSTERS) {
    await notify(`That would leave you with more than ${MAX_STORED_MONSTERS} monsters.`, {
      title: "Too many monsters",
      tone: "warning",
    });
    return;
  }

  storeMonsters(merged);
  await notify(
    `${count} monster${count === 1 ? "" : "s"} added to your Monster Manager.`,
    { title: encounter.name || "Encounter added" },
  );

  // The roster reads from storage on load, so a reload is the simplest way to
  // surface them. Done after the dialog so the message is actually seen.
  window.location.reload();
}

export default {
  shareEncounter,
  loadEncounterFromURL,
  /** Old name, still called from App.tsx's mount effect. */
  loadMonstersFromURL: loadEncounterFromURL,
};
