import { useEffect, useState } from "react";
import ErrorNotice from "./ErrorNotice";
import { errorKey, wasHandled, type CaughtError } from "../utils/errorReport";
import { reportCrash } from "../utils/telemetry";

interface Tracked {
  caught: CaughtError;
  key: string;
  repeats: number;
}

/**
 * Faults that reach the window but are not worth a person's attention.
 *
 * `Script error.` is what a cross-origin script gives you: no message, no file,
 * no line. There is nothing in it to report and it is almost always somebody
 * else's script — the analytics bundle, an extension — so raising a card about
 * it would train people to close the card.
 *
 * The ResizeObserver line is the well-known benign one browsers emit when a
 * layout settles over two frames. It is a warning wearing an error's clothes.
 */
function isNoise(message: string, error: unknown): boolean {
  if (/^script error\.?$/i.test(message.trim())) return true;
  if (/ResizeObserver loop/i.test(message)) return true;
  /* An event with nothing attached tells us nothing we could act on. */
  return error == null && message.trim() === "";
}

/**
 * How long to wait before deciding nobody else is going to handle this.
 *
 * React's development build re-throws a boundary-bound error at the window
 * *before* the boundary's componentDidCatch runs, so claiming it there is
 * always too late — the toast has already drawn a second card for a crash the
 * boundary is showing properly. Sitting on it for a couple of frames and asking
 * again is what closes that race, and on a genuine background fault nobody
 * notices a fifth of a second.
 */
const HANDOVER_MS = 200;

/**
 * The half of "gracefully erroring" that error boundaries cannot reach.
 *
 * React boundaries only see errors thrown while rendering. A throw inside an
 * `onClick`, or a promise nobody caught, unmounts nothing and shows nothing —
 * the button simply does not work, and the person is left wondering whether
 * they tapped it. These listeners turn that silence into the same card the
 * boundaries show, in a corner, dismissible, because the app behind it is very
 * probably still fine.
 */
export default function GlobalErrorNotice() {
  const [tracked, setTracked] = useState<Tracked | null>(null);

  useEffect(() => {
    const pending = new Set<ReturnType<typeof setTimeout>>();

    const record = (caught: CaughtError) => {
      if (wasHandled(caught.error)) return;
      const timer = setTimeout(() => {
        pending.delete(timer);
        /* Ask again: a boundary may have claimed it in the meantime. */
        if (wasHandled(caught.error)) return;
        reportCrash(caught);
        const key = errorKey(caught);
        setTracked((previous) =>
          previous && previous.key === key
            ? { ...previous, repeats: previous.repeats + 1 }
            : { caught, key, repeats: 1 }
        );
      }, HANDOVER_MS);
      pending.add(timer);
    };

    const onError = (event: ErrorEvent) => {
      /* A failed <img> or <script> load also fires "error" on the window, with
         the element as the target. That is a missing file, not a crash, and
         there is nothing here for anyone to report. */
      if (event.target && event.target !== window) return;
      if (isNoise(event.message ?? "", event.error)) return;
      record({
        source: "window",
        error: event.error ?? event.message ?? "Unknown error",
        at: Date.now(),
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (isNoise(typeof reason === "string" ? reason : "", reason)) return;
      record({ source: "promise", error: reason, at: Date.now() });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  if (!tracked) return null;

  return (
    <div className="errorToastWrap">
      <ErrorNotice
        caught={tracked.caught}
        variant="toast"
        repeats={tracked.repeats}
        onDismiss={() => setTracked(null)}
      />
    </div>
  );
}
