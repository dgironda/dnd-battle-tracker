/**
 * Every number field opens with its number selected, so typing replaces it.
 *
 * Tapping a monster's HP of 40 and typing 45 used to give 4045: the caret
 * landed after the 40 and there was no way to type over it without deleting
 * first, which on a phone is a fiddly backspace or two before every change.
 * A number is almost always replaced rather than amended, so the field hands
 * it over selected — the way a browser already does when you Tab into one.
 *
 * One listener on the document rather than a handler on each <input>: it is
 * true of every number field there is, the ones that open in place in a table
 * and the ones in dialogs, and a field added next month gets it without
 * anybody having to remember. `focusin` rather than `focus`, because only
 * focusin bubbles — and it fires for autoFocus as well as for a click.
 */
export function installNumberFieldSelection(root: Document = document): () => void {
  const onFocusIn = (event: FocusEvent) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || field.type !== "number") return;
    field.select();
  };

  root.addEventListener("focusin", onFocusIn);
  return () => root.removeEventListener("focusin", onFocusIn);
}
