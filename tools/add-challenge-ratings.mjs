// Adds each monster's challenge rating ("cr": "1/4", "5", "30") to the
// bestiaries, src/assets/2014monsters.json and 2024monsters.json, from
// 5e.tools' public data. Each monster is matched by its own 5e.tools link (its
// name and book), the same page "View Full Stat Block" opens. A monster with
// no rating there (a spell's summoned spirit, say) is left without one.
//
// Run it again when the lists change:  node tools/add-challenge-ratings.mjs
// It changes nothing else in the files.

import { readFile, writeFile } from 'node:fs/promises';

const DATA = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/';
const LISTS = ['src/assets/2014monsters.json', 'src/assets/2024monsters.json'];

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

const keyOf = (name, source) => `${name.toLowerCase()}|${source.toLowerCase()}`;

/** Every monster 5e.tools lists, by name and book. */
async function allMonsters() {
  const index = await json(`${DATA}index.json`);
  const files = await Promise.all(Object.values(index).map((file) => json(DATA + file)));
  const monsters = new Map();
  for (const file of files) for (const m of file.monster ?? []) monsters.set(keyOf(m.name, m.source), m);
  return monsters;
}

/** A monster's rating, following "_copy" (a variant written as changes to another) to the one it copies. */
function ratingOf(monster, monsters, depth = 0) {
  if (!monster || depth > 5) return null;
  const cr = typeof monster.cr === 'object' && monster.cr !== null ? monster.cr.cr : monster.cr;
  if (typeof cr === 'string' && /^(\d+|1\/[248])$/.test(cr)) return cr;
  const copy = monster._copy;
  return copy ? ratingOf(monsters.get(keyOf(copy.name, copy.source)), monsters, depth + 1) : null;
}

/** "…#adult%20black%20dragon_mm" -> the key for Adult Black Dragon in MM. */
function linkKey(link) {
  const hash = decodeURIComponent(link.split('#')[1] ?? '');
  const at = hash.lastIndexOf('_');
  return at > 0 ? keyOf(hash.slice(0, at), hash.slice(at + 1)) : null;
}

const monsters = await allMonsters();
for (const path of LISTS) {
  const list = JSON.parse(await readFile(path, 'utf8'));
  let rated = 0;
  const missing = [];
  const next = list.map((entry) => {
    const { cr: _old, ...rest } = entry;
    const cr = ratingOf(monsters.get(linkKey(entry.link)), monsters);
    if (!cr) {
      missing.push(entry.name);
      return rest;
    }
    rated++;
    return { ...rest, cr };
  });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`${path}: ${rated} of ${list.length} rated.${missing.length ? ` Without one: ${missing.join(', ')}` : ''}`);
}
