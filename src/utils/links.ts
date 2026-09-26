/** Outbound links that appear in more than one place. */
export const DISCORD_URL = "https://discord.gg/m4AnYSDueM";

/**
 * The channel a crash report goes to.
 *
 * A `discord.com/channels/...` link resolves straight to the channel — but only
 * for somebody who is already in the server. For everybody else it is a dead
 * end, which is the worst possible ending for a page whose entire job is to get
 * the report posted. So the crash card offers both: this as the button, and the
 * invite above as the way in for anyone not in yet.
 */
export const DISCORD_BUG_CHANNEL_URL =
  "https://discord.com/channels/1427146865509531738/1427146866780278832";

/** Named on the card, so it is findable even if the deep link is not followed. */
export const DISCORD_BUG_CHANNEL = "#bt-bug-reports";

/**
 * A link that is safe to put in an href we render, or "" if it is not.
 *
 * Only http(s). A monster's stat-block link comes from whoever typed it — the
 * DM, a shared encounter, a backup file somebody sent — and a `javascript:`
 * one would run as this site when clicked. The CSP already refuses to run
 * those; this makes the link itself never reach the page either.
 */
export function safeLink(link: unknown): string {
  if (typeof link !== "string" || link === "") return "";
  try {
    const url = new URL(link, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}
