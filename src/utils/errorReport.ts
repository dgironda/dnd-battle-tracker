/**
 * Turning a crash into something a DM can paste into Discord.
 *
 * The ask is small — show the error, link the Discord, say "post this there" —
 * but it only works if the thing we hand them is actually postable. Two
 * constraints shape everything here:
 *
 * 1. **Discord messages cap at 2000 characters.** A raw stack trace blows
 *    straight past that, and what a person does then is trim it themselves,
 *    badly, or give up. So the report is budgeted (see REPORT_LIMIT) and the
 *    stack is the part that gets cut, from the bottom, with a marker saying so.
 *
 * 2. **It is going somewhere public.** The URL is the sharp edge: the Patreon
 *    OAuth redirect lands back here as `?code=<authorization code>`, and the
 *    monster share links carry an encoded payload in the query too. Neither
 *    belongs in a message posted to a server full of strangers, so only the
 *    pathname is ever reported — never the query, never the hash.
 *
 * Everything here is pure and takes its inputs as arguments, so the whole
 * shape of a report can be tested without a DOM.
 */

/** Stamped in at build time — see the `define` block in vite.config.ts. */
declare const __BUILD_ID__: string;

export const BUILD_ID: string =
  typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "unknown";

/**
 * How long the finished report may be.
 *
 * Discord's own limit is 2000. The rest is headroom for the fence, and for the
 * sentence somebody inevitably types above it.
 */
export const REPORT_LIMIT = 1900;

/** Where the throw came from. Worth knowing: it changes what we can say. */
export type ErrorSource = "render" | "window" | "promise";

export interface CaughtError {
  source: ErrorSource;
  /** Whatever was thrown. Not necessarily an Error — anything can be thrown. */
  error: unknown;
  /** React's component stack, when a boundary caught it. */
  componentStack?: string;
  /** What was on screen, e.g. "Hero Manager". Undefined for the whole page. */
  where?: string;
  at?: number;
}

export interface DescribedError {
  name: string;
  message: string;
  stack?: string;
}

/**
 * Make sense of an unknown throw.
 *
 * `throw "oops"` is legal, promises reject with plain objects, and a few
 * browsers hand back an event rather than an error. A crash screen that says
 * "[object Object]" is not a crash screen anybody can act on.
 */
export function describeError(error: unknown): DescribedError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || String(error),
      stack: error.stack,
    };
  }
  if (typeof error === "string") {
    return { name: "Error", message: error };
  }
  if (error && typeof error === "object") {
    const shape = error as { name?: unknown; message?: unknown; stack?: unknown };
    const message =
      typeof shape.message === "string" && shape.message
        ? shape.message
        : safeStringify(error);
    return {
      name: typeof shape.name === "string" && shape.name ? shape.name : "Error",
      message,
      stack: typeof shape.stack === "string" ? shape.stack : undefined,
    };
  }
  return { name: "Error", message: String(error) };
}

function safeStringify(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return json && json !== "{}" ? json : String(value);
  } catch {
    return String(value);
  }
}

/**
 * The one line shown to the person on screen.
 *
 * Not the stack — a stack in the middle of a page reads as the app shouting at
 * you. The stack is in the report, which is the bit that gets pasted.
 */
export function headline(error: unknown): string {
  const { name, message } = describeError(error);
  const text = name && name !== "Error" ? `${name}: ${message}` : message;
  return collapse(text, 300);
}

/**
 * Two throws of the same fault should not stack up two notices.
 *
 * Keyed on the message and the first frame rather than the whole stack: a
 * render loop produces slightly different stacks for what is one bug.
 */
export function errorKey(caught: CaughtError): string {
  const { name, message, stack } = describeError(caught.error);
  const firstFrame = (stack ?? "").split("\n").find((l) => /\s+at\s/.test(l)) ?? "";
  return [caught.source, caught.where ?? "", name, message, firstFrame.trim()].join("|");
}

export interface ReportContext {
  buildId?: string;
  url?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
  language?: string;
}

/**
 * Read the environment for a report. Split out from `buildReport` so the
 * builder itself stays pure and testable.
 */
export function readContext(): ReportContext {
  const context: ReportContext = { buildId: BUILD_ID };
  if (typeof window !== "undefined") {
    context.url = window.location?.pathname;
    /* A crash during load can catch innerWidth before the viewport is known,
       and "0x0 portrait" in a bug report is worse than no line at all — hence
       the documentElement fallback and the zero check in buildReport. */
    const width = window.innerWidth || document?.documentElement?.clientWidth || 0;
    const height = window.innerHeight || document?.documentElement?.clientHeight || 0;
    context.viewport = { width, height };
  }
  if (typeof navigator !== "undefined") {
    context.userAgent = navigator.userAgent;
    context.language = navigator.language;
  }
  return context;
}

/**
 * The block that gets pasted into Discord.
 *
 * Fenced, so Discord renders it as a code block instead of eating the
 * underscores in a stack trace. Any fence inside the error's own text is
 * defused first, or it would close ours early and spill the rest as prose.
 */
export function buildReport(caught: CaughtError, context: ReportContext = {}): string {
  const { name, message, stack } = describeError(caught.error);
  const when = new Date(caught.at ?? Date.now());

  const lines: string[] = [
    "D&D Battle Tracker — crash report",
    `When:    ${when.toISOString()}`,
    `Where:   ${whereLabel(caught)}`,
    `Build:   ${context.buildId ?? BUILD_ID}`,
  ];
  /* Pathname only. The query is where the Patreon `code` and the share
     payloads live, and this is going somewhere public. */
  if (context.url) lines.push(`Page:    ${context.url}`);
  if (context.viewport && context.viewport.width > 0 && context.viewport.height > 0) {
    const { width, height } = context.viewport;
    const shape = height >= width ? "portrait" : "landscape";
    lines.push(`Screen:  ${width}x${height} ${shape}`);
  }
  if (context.language) lines.push(`Lang:    ${context.language}`);
  if (context.userAgent) lines.push(`Browser: ${context.userAgent}`);

  lines.push("", `${name}: ${message}`);

  const head = lines.join("\n");
  /* The traces are what gets cut, because they are the only part with no
     fixed length — and the header alone is still a report worth posting. */
  const room = REPORT_LIMIT - fence("").length - head.length;
  const traces = joinTraces(stack, caught.componentStack, room);

  return fence(defuse(traces ? `${head}\n${traces}` : head));
}

/**
 * The one line that tells us where to look.
 *
 * A render crash has a place — a boundary knows which panel it wraps. The other
 * two do not, and saying "the whole page" about a rejected promise would send
 * us hunting in the wrong half of the app.
 */
function whereLabel(caught: CaughtError): string {
  switch (caught.source) {
    case "render":
      return `${caught.where ?? "the whole page"} (while drawing it)`;
    case "promise":
      return "a background task (unhandled promise rejection)";
    default:
      return "somewhere while the app was running (uncaught error)";
  }
}

/**
 * Fit the stack and the component stack into whatever room is left.
 *
 * The component stack gets the smaller share but is never dropped outright:
 * "at HeroRow / at HeroManager" points at the bug faster than twenty frames of
 * minified React internals do.
 */
function joinTraces(
  stack: string | undefined,
  componentStack: string | undefined,
  room: number
): string {
  if (room <= 0) return "";
  const parts: string[] = [];
  let left = room;

  if (componentStack?.trim()) {
    const share = Math.min(left, Math.max(200, Math.floor(room * 0.4)));
    const block = `\nComponent stack:${trimTrace(componentStack, share - 18)}`;
    parts.push(block);
    left -= block.length;
  }
  if (stack?.trim() && left > 60) {
    parts.push(`\nStack:${trimTrace(stack, left - 8)}`);
  }
  return parts.join("");
}

/** Keep the top frames — the bottom of a stack is React and the bundler. */
function trimTrace(trace: string, budget: number): string {
  const normalised = "\n" + trace.replace(/\r\n/g, "\n").trim();
  if (budget <= 0) return "";
  if (normalised.length <= budget) return normalised;
  const cut = normalised.slice(0, Math.max(0, budget - 20));
  return `${cut.slice(0, cut.lastIndexOf("\n") + 1 || cut.length)}    … trimmed`;
}

/** A stray ``` inside the text would close our fence and spill the rest. */
function defuse(text: string): string {
  return text.replace(/```/g, "'''");
}

function fence(body: string): string {
  return "```\n" + body + "\n```";
}

function collapse(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Put the report on the clipboard.
 *
 * The async Clipboard API needs a secure context and a live user gesture, and
 * is refused outright in a few embedded browsers — which are exactly the ones
 * a phone user might be in. The old execCommand path is the fallback, and it
 * needs the textarea to be in the document and selectable, hence the offscreen
 * placement rather than `display: none`.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the older path */
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Errors a boundary has already put on screen.
 *
 * React 18's development build re-dispatches an error it has already handed to
 * a boundary so devtools get a real stack, and that re-dispatch lands on
 * `window.onerror`. Without a claim here the same crash draws twice: once as the
 * boundary's card and once as the background toast.
 *
 * The obvious implementation — a WeakSet of the thrown objects — does not work,
 * and it is worth saying why. StrictMode renders twice, so a component that
 * throws constructs a *new* Error on each attempt: the window sees one instance
 * and the boundary holds another. Identity never matches. So the claim is on the
 * error's name and message instead, which are the same across both throws.
 *
 * A claim expires, because a message is not unique the way an object is: the
 * same fault happening again ten seconds later deserves to be seen.
 */
const CLAIM_MS = 2000;
const claims = new Map<string, number>();

function signature(error: unknown): string {
  const { name, message } = describeError(error);
  return `${name}: ${message}`;
}

export function markHandled(error: unknown): void {
  const now = Date.now();
  /* Swept on write rather than on a timer: the map only grows when something
     is already going wrong, and this keeps it from outliving the crash. */
  for (const [key, until] of claims) if (until < now) claims.delete(key);
  claims.set(signature(error), now + CLAIM_MS);
}

export function wasHandled(error: unknown): boolean {
  const until = claims.get(signature(error));
  if (until === undefined) return false;
  if (until < Date.now()) {
    claims.delete(signature(error));
    return false;
  }
  return true;
}

/** Test seam: drop every outstanding claim. */
export function resetHandled(): void {
  claims.clear();
}
