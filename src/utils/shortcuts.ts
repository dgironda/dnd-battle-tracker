/**
 * Whether a key press is a bare keyboard shortcut rather than typing.
 *
 * The tracker's shortcuts are single letters — W, E and R for the managers,
 * A, S and D for the turn, X to close a stat panel — so they must never fire
 * while somebody is typing a name or a note, and never steal a key held with
 * Ctrl, Alt, Shift or Cmd from the browser.
 */
export function isShortcut(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  ) {
    return false;
  }
  return !(e.ctrlKey || e.shiftKey || e.altKey || e.metaKey);
}
