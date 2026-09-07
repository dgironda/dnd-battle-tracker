import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import type { FocusEvent, MouseEvent } from "react";

interface Tip {
  text: string;
  name: string;
  x: number;
  y: number;
  above: boolean;
}

/**
 * The condition description, shown the moment the pointer lands on a chip.
 *
 * It used to ride on `title`, which carries the browser's own ~1s delay and no
 * way to shorten it. This is the same text in an element we own.
 *
 * It goes through a portal because it must not be clipped, and everywhere it
 * is used sits inside something that would clip it: the tracker's conditions
 * cell is `overflow: hidden` inside #battleTrackerScroll, which is a size
 * container and so the containing block for fixed positioning too, and the
 * side-car panels carry their own `clip-path`.
 */
export function useConditionTip(idPrefix: string) {
  const [tip, setTip] = useState<Tip | null>(null);
  const tipId = `conditionTip-${idPrefix}`;

  /* Both memoised: callers put hideTip in effect dependencies to clear a tip
     whose chip has gone, and a new identity every render would re-run those. */
  const showTip = useCallback((
    e: MouseEvent | FocusEvent,
    name: string,
    text: string | undefined,
  ) => {
    if (!text) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const above = below < 210 && r.top > below;
    setTip({
      text,
      name,
      // clamped to half the card's width, so it always lands on screen
      x: Math.min(Math.max(r.left + r.width / 2, 168), window.innerWidth - 168),
      y: above ? r.top - 8 : r.bottom + 8,
      above,
    });
  }, []);

  const hideTip = useCallback(() => setTip(null), []);

  const tipNode = tip
    ? createPortal(
        <div
          id={tipId}
          role="tooltip"
          className={`conditionTip${tip.above ? " isAbove" : ""}`}
          style={{ left: tip.x, top: tip.y }}
        >
          <span className="conditionTipName">{tip.name}</span>
          {tip.text}
        </div>,
        document.body,
      )
    : null;

  return { showTip, hideTip, tipNode, tipId, tipName: tip?.name };
}
