import { useEffect, useRef } from "react";

/**
 * How long the current turn has been going, written into the span the ref is
 * given (RoundNumberSpan's) once a second.
 *
 * Written straight to the DOM rather than through state: a once-a-second
 * re-render of the whole tracker to change one line of text is not worth it.
 * `lastRun` is when the turn started, or null before the first one.
 */
export function useTurnTimer(lastRun: number | null) {
  const timerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!lastRun) {
      if (timerRef.current) {
        timerRef.current.innerText = "Advance the turn to start the timer";
      }
      return;
    }

    const render = () => {
      const totalSeconds = Math.floor((Date.now() - lastRun) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let timeString = `${seconds}s`;
      if (minutes > 0) timeString = `${minutes}m ${timeString}`;
      if (hours > 0) timeString = `${hours}h ${timeString}`;

      if (timerRef.current) {
        timerRef.current.innerText = "Current Turn Time: " + timeString;
      }
    };

    render();
    const interval = setInterval(render, 1000);
    return () => clearInterval(interval);
  }, [lastRun]);

  return timerRef;
}
