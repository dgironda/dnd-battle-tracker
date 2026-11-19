import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Browsers without :has() (Firefox before 121, ESR 115 among them) drop a
// whole rule when one selector in its list uses :has(), plain selectors and
// all: that is how BattleTracker's pencil checkboxes lost their marks there. A :has() selector goes
// in a rule of its own (or inside :is()/:where(), whose lists forgive it).

const src = resolve(import.meta.dirname, '../src');
const cssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? cssFiles(join(dir, e.name)) : e.name.endsWith('.css') ? [join(dir, e.name)] : []));

/** A selector list split at its top-level commas (not those inside :is(), :not() and the like). */
function selectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  return [...out, cur.trim()].filter(Boolean);
}

/** Whether a selector needs :has() outside a forgiving :is() or :where(). */
const needsHas = (selector: string) => selector.replace(/:(is|where)\((?:[^()]|\([^()]*\))*\)/g, '').includes(':has(');

/** Every rule whose list mixes :has() selectors with ones that don't need it, as "file:line". */
function mixedRules(file: string): string[] {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const found: string[] = [];
  for (const m of css.matchAll(/([^{};]+)\{/g)) {
    const list = selectors(m[1]);
    if (!list.length || list[0].startsWith('@')) continue;
    const has = list.filter(needsHas).length;
    if (has && has < list.length) found.push(`${relative(src, file)}:${css.slice(0, m.index! + m[1].length - m[1].trimStart().length).split('\n').length}`);
  }
  return found;
}

describe('CSS in browsers without :has()', () => {
  it('never puts a :has() selector in a list with plain ones', () => {
    expect(cssFiles(src).flatMap(mixedRules)).toEqual([]);
  });

  it('finds the mix it looks for', () => {
    expect(needsHas('.a:has(.b)')).toBe(true);
    expect(needsHas(':is(.a:has(.b), .c)')).toBe(false);
    expect(selectors('.a:not(.x, .y), .b:has(.c, .d)')).toEqual(['.a:not(.x, .y)', '.b:has(.c, .d)']);
  });
});
