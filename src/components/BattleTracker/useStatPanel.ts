import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Open/closed state for a combatant's stat panel.
 *
 * Hover opens it on a pointer that can hover. On anything else — which in
 * practice is the card layout, and in practice that is a phone — hover is not
 * a thing that happens, and the panel is opened and closed by tapping.
 *
 * That distinction used to be missing, and the panel could not be closed at
 * all on a touch screen. A tap fires a synthetic `mouseenter` as well as a
 * `click`, so the first tap set BOTH flags; the second tap toggled `isStuck`
 * back off, but nothing ever fires `mouseleave` on a touch screen, so
 * `isHovering` stayed true and the panel stayed open. Tapping the panel, the
 * name, or anywhere else made no difference.
 *
 * So `hover: none` ignores hover entirely and the tap is the whole story, and
 * a pointerdown anywhere outside closes — which is what a panel over a page
 * should do on any device.
 */

/** Matches the CSS: the card layout is portrait OR a narrow window. */
const CARD_LAYOUT = "(orientation: portrait), (max-width: 62.99rem)";

/** Things inside the panel that do their own job and must not close it. */
const INTERACTIVE =
  'a, button, input, textarea, select, [contenteditable="true"], .setEditingField, .conditionName';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useStatPanel() {
  const [isHovering, setIsHovering] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* Card layout means tap, so hover does not get a vote. Without this the
     synthetic mouseenter a tap produces would hold the panel open forever. */
  const tapOnly = useMediaQuery(CARD_LAYOUT);
  const isOpen = isStuck || (!tapOnly && isHovering);

  const close = useCallback(() => {
    setIsStuck(false);
    setIsHovering(false);
  }, []);

  /* One handler for click and for tap, because a tap IS a click: the same
     gesture should not mean "pin" the first time and nothing the second. */
  const toggle = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE)) return;
      if (isOpen) close();
      else setIsStuck(true);
    },
    [isOpen, close],
  );

  const onMouseEnter = useCallback(() => {
    if (!tapOnly) setIsHovering(true);
  }, [tapOnly]);

  const onMouseLeave = useCallback(() => {
    if (!tapOnly) setIsHovering(false);
  }, [tapOnly]);

  /* Anywhere else closes it. `pointerdown` rather than `click` so it happens
     on the way down, before whatever was tapped acts on it. */
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, close]);

  return { rootRef, isOpen, close, toggle, onMouseEnter, onMouseLeave };
}
