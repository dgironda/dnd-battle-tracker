/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { installNumberFieldSelection } from '../src/utils/numberFields';

/**
 * Number fields open with their number selected, so typing replaces it rather
 * than landing after it — 40 and a typed 45 used to make 4045.
 *
 * Only number fields: a name is usually amended, not replaced, and selecting
 * it would lose the whole thing to the first keystroke.
 */

function field(type: string, value: string) {
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  document.body.appendChild(input);
  return input;
}

describe('number fields select their number on focus', () => {
  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('selects a number field when it is focused', () => {
    const hp = field('number', '40');
    uninstall = installNumberFieldSelection();
    const select = vi.spyOn(hp, 'select');

    hp.focus();

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('leaves a text field as it is', () => {
    uninstall = installNumberFieldSelection();
    const name = field('text', 'Goblin 1');
    const select = vi.spyOn(name, 'select');

    name.focus();

    expect(select).not.toHaveBeenCalled();
  });

  it('covers a field that arrives after it was installed', () => {
    /* The point of listening on the document: a field that opens in place,
       long after the page loaded, is still a number field. */
    uninstall = installNumberFieldSelection();
    const later = field('number', '15');
    const select = vi.spyOn(later, 'select');

    later.focus();

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('stops once uninstalled', () => {
    installNumberFieldSelection()();
    const hp = field('number', '40');
    const select = vi.spyOn(hp, 'select');

    hp.focus();

    expect(select).not.toHaveBeenCalled();
  });
});
