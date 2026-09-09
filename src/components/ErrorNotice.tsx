import { useCallback, useMemo, useState } from "react";
import {
  DISCORD_BUG_CHANNEL,
  DISCORD_BUG_CHANNEL_URL,
  DISCORD_URL,
} from "../utils/links";
import {
  buildReport,
  copyText,
  headline,
  readContext,
  type CaughtError,
} from "../utils/errorReport";

export type NoticeVariant = "page" | "panel" | "toast";

interface ErrorNoticeProps {
  caught: CaughtError;
  variant: NoticeVariant;
  /** How many times this same fault has been seen. Shown from two up. */
  repeats?: number;
  /** "Try again" / "Reload" — omitted when there is nothing sensible to retry. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Dismiss, for the surfaces that can be dismissed. */
  onDismiss?: () => void;
  /** The last resort, offered only once reloading has stopped helping. */
  onClearFight?: () => void;
}

/**
 * What a person sees when something has gone wrong.
 *
 * The same card in three sizes, because the three things that can break are
 * different sizes of problem: the whole page, one panel, or something in the
 * background. All three say the same three things — what broke, here it is,
 * post it in Discord — and all three put the report one tap away, because an
 * instruction to report a bug is only as good as the paste that follows it.
 */
export default function ErrorNotice({
  caught,
  variant,
  repeats = 1,
  onRetry,
  retryLabel,
  onDismiss,
  onClearFight,
}: ErrorNoticeProps) {
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");

  const summary = useMemo(() => headline(caught.error), [caught]);
  const report = useMemo(() => buildReport(caught, readContext()), [caught]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(report);
    setCopied(ok ? "yes" : "failed");
  }, [report]);

  const what = caught.where ?? "The tracker";
  const title =
    variant === "page"
      ? "The tracker hit a snag"
      : variant === "panel"
        ? `${what} stopped working`
        : /* The lede says "in the background"; the title saying it too wrapped
             onto two lines in the corner and read as a longer problem. */
          "Something went wrong";

  return (
    <div className={`errorNotice is-${variant}`} role="alert">
      <div className="errorNoticeHead">
        <h2 className="errorNoticeTitle">{title}</h2>
        {repeats > 1 && (
          <span className="errorNoticeCount" title={`Seen ${repeats} times`}>
            ×{repeats}
          </span>
        )}
        {onDismiss && (
          <button
            type="button"
            className="errorNoticeDismiss"
            onClick={onDismiss}
            aria-label="Dismiss this message"
          >
            ×
          </button>
        )}
      </div>

      <p className="errorNoticeLede">
        {variant === "page" ? (
          <>
            Nothing has been deleted — your heroes, monsters and saved battles are
            still here in this browser.
          </>
        ) : variant === "panel" ? (
          <>The rest of the tracker is still running, so your fight is safe.</>
        ) : (
          <>The tracker is still running, so carry on if it looks right.</>
        )}{" "}
        Send us the report below and we&apos;ll fix it.
      </p>

      <p className="errorNoticeMessage">{summary}</p>

      <ol className="errorNoticeSteps">
        <li>
          <button type="button" className="drawnBtn isGreen errorNoticeCopy" onClick={handleCopy}>
            {copied === "yes" ? "Copied" : copied === "failed" ? "Copy failed" : "Copy the report"}
          </button>
          {copied === "failed" && (
            <span className="errorNoticeHint">
              Your browser blocked the clipboard — open the report below and select it
              by hand.
            </span>
          )}
        </li>
        <li>
          <a
            className="drawnBtn errorNoticeDiscord"
            href={DISCORD_BUG_CHANNEL_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open {DISCORD_BUG_CHANNEL}
          </a>
          <span className="errorNoticeHint">
            Paste it there and we&apos;ll pick it up — that block is the whole of it,
            and it tells us exactly what went wrong.{" "}
            {/* The channel link only resolves for members; this is the way in
                for everyone else, and it is the same invite as the footer. */}
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">
              Not in the server yet?
            </a>
          </span>
        </li>
      </ol>

      <details className="errorNoticeDetails">
        <summary>Show the report</summary>
        <textarea
          className="errorNoticeReport"
          readOnly
          rows={variant === "page" ? 12 : 7}
          value={report}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Crash report, ready to copy"
        />
      </details>

      {(onRetry || onClearFight) && (
        <div className="errorNoticeActions">
          {onRetry && (
            <button type="button" className="drawnBtn" onClick={onRetry}>
              {retryLabel ?? "Try again"}
            </button>
          )}
          {onClearFight && (
            <button type="button" className="drawnBtn isRed" onClick={onClearFight}>
              Clear the current fight
            </button>
          )}
        </div>
      )}

      {onClearFight && (
        <p className="errorNoticeLastResort">
          Reloading has not helped, so the fight in progress may be the problem.
          Clearing it leaves your heroes, monsters and saved battles alone.
        </p>
      )}
    </div>
  );
}
